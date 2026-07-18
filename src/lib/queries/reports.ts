import { createClient } from "@/lib/supabase/server";
import type { ActivityType, CompanyCategory } from "@/lib/types";

// Backs the per-rep "Design Firm Activity" PDF a rep generates on-demand from /reports.
// The product engineering team keeps its own separate contacts spreadsheet (no CRM
// logins), so a rep forwards this PDF and the engineer folds the new info into her own
// database. Everything here is scoped to the logged-in rep by normal RLS
// (rep_id = auth.uid()) -- each rep reports their own territory's activity, and each rep
// has an independent "since last generated" watermark, so two reps can each send fresh
// updates without stepping on each other or duplicating rows.

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

export interface NewFirmRow {
  companyName: string;
  category: CompanyCategory;
  address: string | null;
  createdAt: string;
}

export interface NewContactRow {
  contactName: string;
  title: string | null;
  phone: string | null;
  email: string | null;
  companyName: string;
  officeName: string;
  createdAt: string;
}

export interface ActivityRow {
  activityType: ActivityType;
  activityDate: string;
  notes: string;
  companyName: string;
  officeName: string;
  contactName: string | null;
}

export interface ScheduledLunchLearnRow {
  companyName: string;
  officeName: string;
  city: string | null;
  scheduledAt: string;
}

export interface DesignFirmReportData {
  firms: NewFirmRow[];
  contacts: NewContactRow[];
  activity: ActivityRow[];
  lunchLearns: ScheduledLunchLearnRow[];
}

// Embedded PostgREST relations come back as either an object or a single-element array
// depending on the relationship shape; normalize to a single record (or null).
function one<T>(rel: T | T[] | null | undefined): T | null {
  if (Array.isArray(rel)) return rel[0] ?? null;
  return rel ?? null;
}

function buildAddress(parts: {
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}): string | null {
  const line1 = parts.address?.trim() || "";
  const cityState = [parts.city?.trim(), parts.state?.trim()].filter(Boolean).join(", ");
  const tail = [cityState, parts.zip?.trim()].filter(Boolean).join(" ");
  const full = [line1, tail].filter(Boolean).join(", ");
  return full || null;
}

// Everything new for this rep since `since`. All four queries are RLS-scoped to the
// rep automatically, and category-filtered to design firms via inner joins.
export async function getDesignFirmReportData(since: string): Promise<DesignFirmReportData> {
  const supabase = await createClient();

  const [firmRes, contactRes, activityRes, llRes] = await Promise.all([
    supabase
      .from("companies")
      .select("id, name, category, created_at")
      .in("category", DESIGN_FIRM_CATEGORIES)
      .gt("created_at", since)
      .order("created_at"),
    supabase
      .from("contacts")
      .select("name, title, phone, email, created_at, locations!inner(name, companies!inner(name, category))")
      .in("locations.companies.category", DESIGN_FIRM_CATEGORIES)
      .gt("created_at", since)
      .order("created_at"),
    supabase
      .from("visit_notes")
      .select(
        "activity_type, visit_date, notes, created_at, contacts(name), locations!inner(name, companies!inner(name, category))"
      )
      .in("locations.companies.category", DESIGN_FIRM_CATEGORIES)
      .gt("created_at", since)
      .order("created_at"),
    supabase
      .from("locations")
      .select("name, city, lunch_learn_scheduled_at, updated_at, companies!inner(name, category)")
      .in("companies.category", DESIGN_FIRM_CATEGORIES)
      .not("lunch_learn_scheduled_at", "is", null)
      .gt("updated_at", since)
      .order("lunch_learn_scheduled_at"),
  ]);

  if (firmRes.error) throw new Error(firmRes.error.message);
  if (contactRes.error) throw new Error(contactRes.error.message);
  if (activityRes.error) throw new Error(activityRes.error.message);
  if (llRes.error) throw new Error(llRes.error.message);

  // Pull addresses for the new firms from their locations (companies have no address of
  // their own -- it lives on the branch/office row).
  type FirmCompany = { id: string; name: string; category: CompanyCategory; created_at: string };
  const firmCompanies = (firmRes.data ?? []) as FirmCompany[];
  const firmIds = firmCompanies.map((c) => c.id);

  const addressByCompany = new Map<string, string>();
  if (firmIds.length > 0) {
    const { data: locRows, error: locError } = await supabase
      .from("locations")
      .select("company_id, address, city, state, zip, created_at")
      .in("company_id", firmIds)
      .order("created_at");
    if (locError) throw new Error(locError.message);
    for (const l of (locRows ?? []) as {
      company_id: string;
      address: string | null;
      city: string | null;
      state: string | null;
      zip: string | null;
    }[]) {
      if (addressByCompany.has(l.company_id)) continue; // first (earliest) office wins
      const addr = buildAddress(l);
      if (addr) addressByCompany.set(l.company_id, addr);
    }
  }

  const firms: NewFirmRow[] = firmCompanies.map((c) => ({
    companyName: c.name,
    category: c.category,
    address: addressByCompany.get(c.id) ?? null,
    createdAt: c.created_at,
  }));

  type ContactJoin = {
    name: string;
    title: string | null;
    phone: string | null;
    email: string | null;
    created_at: string;
    locations: { name: string; companies: { name: string } | { name: string }[] | null } | { name: string; companies: { name: string } | { name: string }[] | null }[] | null;
  };
  const contacts: NewContactRow[] = ((contactRes.data ?? []) as unknown as ContactJoin[]).map((c) => {
    const loc = one(c.locations);
    const company = one(loc?.companies);
    return {
      contactName: c.name,
      title: c.title,
      phone: c.phone,
      email: c.email,
      companyName: company?.name ?? "",
      officeName: loc?.name ?? "",
      createdAt: c.created_at,
    };
  });

  type ActivityJoin = {
    activity_type: ActivityType;
    visit_date: string;
    notes: string;
    contacts: { name: string } | { name: string }[] | null;
    locations: { name: string; companies: { name: string } | { name: string }[] | null } | { name: string; companies: { name: string } | { name: string }[] | null }[] | null;
  };
  const activity: ActivityRow[] = ((activityRes.data ?? []) as unknown as ActivityJoin[]).map((a) => {
    const loc = one(a.locations);
    const company = one(loc?.companies);
    const contact = one(a.contacts);
    return {
      activityType: a.activity_type,
      activityDate: a.visit_date,
      notes: a.notes,
      companyName: company?.name ?? "",
      officeName: loc?.name ?? "",
      contactName: contact?.name ?? null,
    };
  });

  type LLJoin = {
    name: string;
    city: string | null;
    lunch_learn_scheduled_at: string;
    companies: { name: string } | { name: string }[] | null;
  };
  const lunchLearns: ScheduledLunchLearnRow[] = ((llRes.data ?? []) as unknown as LLJoin[]).map((l) => {
    const company = one(l.companies);
    return {
      companyName: company?.name ?? "",
      officeName: l.name,
      city: l.city,
      scheduledAt: l.lunch_learn_scheduled_at,
    };
  });

  return { firms, contacts, activity, lunchLearns };
}

export async function recordReportRun(userId: string, userEmail: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("design_firm_report_runs")
    .insert({ generated_by: userId, generated_by_email: userEmail });
  if (error) throw new Error(error.message);
}

export function reportDataIsEmpty(data: DesignFirmReportData): boolean {
  return (
    data.firms.length === 0 &&
    data.contacts.length === 0 &&
    data.activity.length === 0 &&
    data.lunchLearns.length === 0
  );
}
