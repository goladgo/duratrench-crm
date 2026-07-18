import { createClient } from "@/lib/supabase/server";
import type { CompanyCategory } from "@/lib/types";

// Backs the per-rep "Design Firm Activity" PDF a rep generates on-demand from /reports.
// The product engineering team keeps its own separate contacts spreadsheet (no CRM
// logins), so a rep forwards this PDF and the engineer folds the new info into her own
// database. Everything here is scoped to the logged-in rep by normal RLS
// (rep_id = auth.uid()) -- each rep reports their own territory's activity, and each rep
// has an independent "since last generated" watermark, so two reps can each send fresh
// updates without stepping on each other or duplicating rows.
//
// A firm only shows up in the report if something actually *happened* there (a contact
// was added, or an activity was logged) since the last report -- not just because the
// company record exists. This matters because reps bulk-importing their existing
// distributor/firm list into the CRM would otherwise flood the engineer with hundreds of
// firms that have no real update to report.

const DESIGN_FIRM_CATEGORIES: CompanyCategory[] = ["civil_engineering", "landscape_architecture"];

// A first-ever report (this rep has never generated one) should include everything to
// date, so we fall back to a timestamp before any data existed.
export const FIRST_REPORT_SINCE = "2000-01-01T00:00:00Z";

export interface DesignFirmReportRun {
  id: string;
  generated_at: string;
  generated_by_email: string;
}

// Last run for THIS rep only -- the watermark is per-rep so each rep's report picks up
// only what's new since *they* last generated one.
export async function getLastReportRunForRep(repId: string): Promise<DesignFirmReportRun | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("design_firm_report_runs")
    .select("id, generated_at, generated_by_email")
    .eq("generated_by", repId)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as DesignFirmReportRun | null) ?? null;
}

export interface NewContactRow {
  companyId: string;
  companyName: string;
  officeName: string;
  city: string | null;
  contactName: string;
  title: string | null;
  phone: string | null;
  email: string | null;
}

// A unified "something happened" row -- a visit/call/email, or a Lunch & Learn getting
// scheduled or marked completed. Lunch & Learns count as activity too since they're a
// meaningful touchpoint the engineer should know about, same as a visit or call.
export interface ActivityRow {
  companyId: string;
  companyName: string;
  officeName: string;
  city: string | null;
  contactName: string | null;
  label: string; // "Visit" | "Call" | "Email" | "Lunch & Learn Scheduled" | "Lunch & Learn Completed"
  date: string;
  notes: string;
}

export interface DesignFirmReportData {
  contacts: NewContactRow[];
  activity: ActivityRow[];
}

export interface CompanyReportGroup {
  companyId: string;
  companyName: string;
  city: string | null;
  contacts: NewContactRow[];
  activity: ActivityRow[];
}

// Embedded PostgREST relations come back as either an object or a single-element array
// depending on the relationship shape; normalize to a single record (or null).
function one<T>(rel: T | T[] | null | undefined): T | null {
  if (Array.isArray(rel)) return rel[0] ?? null;
  return rel ?? null;
}

// Everything new for this rep since `since`. Both queries are RLS-scoped to the rep
// automatically, and category-filtered to design firms via inner joins.
export async function getDesignFirmReportData(since: string): Promise<DesignFirmReportData> {
  const supabase = await createClient();

  const [contactRes, activityRes, llRes] = await Promise.all([
    supabase
      .from("contacts")
      .select(
        "name, title, phone, email, created_at, locations!inner(company_id, name, city, companies!inner(name, category))"
      )
      .in("locations.companies.category", DESIGN_FIRM_CATEGORIES)
      .gt("created_at", since)
      .order("created_at"),
    supabase
      .from("visit_notes")
      .select(
        "activity_type, visit_date, notes, created_at, contacts(name), locations!inner(company_id, name, city, companies!inner(name, category))"
      )
      .in("locations.companies.category", DESIGN_FIRM_CATEGORIES)
      .gt("created_at", since)
      .order("created_at"),
    supabase
      .from("locations")
      .select("company_id, name, city, lunch_learn_scheduled_at, lunch_learn_completed_at, updated_at, companies!inner(name, category)")
      .in("companies.category", DESIGN_FIRM_CATEGORIES)
      .or("lunch_learn_scheduled_at.not.is.null,lunch_learn_completed_at.not.is.null")
      .gt("updated_at", since)
      .order("updated_at"),
  ]);

  if (contactRes.error) throw new Error(contactRes.error.message);
  if (activityRes.error) throw new Error(activityRes.error.message);
  if (llRes.error) throw new Error(llRes.error.message);

  type LocJoin = { company_id: string; name: string; city: string | null; companies: { name: string } | { name: string }[] | null };

  type ContactJoin = {
    name: string;
    title: string | null;
    phone: string | null;
    email: string | null;
    created_at: string;
    locations: LocJoin | LocJoin[] | null;
  };
  const contacts: NewContactRow[] = ((contactRes.data ?? []) as unknown as ContactJoin[]).map((c) => {
    const loc = one(c.locations);
    const company = one(loc?.companies);
    return {
      companyId: loc?.company_id ?? "",
      companyName: company?.name ?? "",
      officeName: loc?.name ?? "",
      city: loc?.city ?? null,
      contactName: c.name,
      title: c.title,
      phone: c.phone,
      email: c.email,
    };
  });

  type VisitJoin = {
    activity_type: "visit" | "call" | "email";
    visit_date: string;
    notes: string;
    contacts: { name: string } | { name: string }[] | null;
    locations: LocJoin | LocJoin[] | null;
  };
  const ACTIVITY_LABEL: Record<string, string> = { visit: "Visit", call: "Call", email: "Email" };
  const visitActivity: ActivityRow[] = ((activityRes.data ?? []) as unknown as VisitJoin[]).map((a) => {
    const loc = one(a.locations);
    const company = one(loc?.companies);
    const contact = one(a.contacts);
    return {
      companyId: loc?.company_id ?? "",
      companyName: company?.name ?? "",
      officeName: loc?.name ?? "",
      city: loc?.city ?? null,
      contactName: contact?.name ?? null,
      label: ACTIVITY_LABEL[a.activity_type] ?? a.activity_type,
      date: a.visit_date,
      notes: a.notes,
    };
  });

  type LLJoin = {
    company_id: string;
    name: string;
    city: string | null;
    lunch_learn_scheduled_at: string | null;
    lunch_learn_completed_at: string | null;
    companies: { name: string } | { name: string }[] | null;
  };
  const lunchLearnActivity: ActivityRow[] = ((llRes.data ?? []) as unknown as LLJoin[]).map((l) => {
    const company = one(l.companies);
    // If it's been marked completed, that supersedes "scheduled" as the more relevant,
    // final state -- there's no separate timestamp for when it was scheduled vs.
    // completed, so showing both would risk implying two separate events.
    const completed = l.lunch_learn_completed_at;
    const scheduled = l.lunch_learn_scheduled_at;
    return {
      companyId: l.company_id,
      companyName: company?.name ?? "",
      officeName: l.name,
      city: l.city,
      contactName: null,
      label: completed ? "Lunch & Learn Completed" : "Lunch & Learn Scheduled",
      date: (completed ?? scheduled) as string,
      notes: "",
    };
  });

  const activity = [...visitActivity, ...lunchLearnActivity].sort((a, b) => (a.date < b.date ? 1 : -1));

  return { contacts, activity };
}

export function groupReportDataByCompany(data: DesignFirmReportData): CompanyReportGroup[] {
  const groups = new Map<string, CompanyReportGroup>();

  function ensure(companyId: string, companyName: string, city: string | null): CompanyReportGroup {
    let g = groups.get(companyId);
    if (!g) {
      g = { companyId, companyName, city, contacts: [], activity: [] };
      groups.set(companyId, g);
    } else if (!g.city && city) {
      g.city = city;
    }
    return g;
  }

  for (const c of data.contacts) {
    ensure(c.companyId, c.companyName, c.city).contacts.push(c);
  }
  for (const a of data.activity) {
    ensure(a.companyId, a.companyName, a.city).activity.push(a);
  }

  return Array.from(groups.values()).sort((a, b) => a.companyName.localeCompare(b.companyName));
}

export async function recordReportRun(userId: string, userEmail: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("design_firm_report_runs")
    .insert({ generated_by: userId, generated_by_email: userEmail });
  if (error) throw new Error(error.message);
}

export function reportDataIsEmpty(data: DesignFirmReportData): boolean {
  return data.contacts.length === 0 && data.activity.length === 0;
}
