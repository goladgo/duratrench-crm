import { createClient } from "@/lib/supabase/server";
import type { ActivityType, OpportunityKind, OpportunityStage } from "@/lib/types";

// Backs the "Daily Activity Report" PDF on /reports -- a rep's own visits/calls/emails
// and quotes/specs for a single calendar day, meant to be forwarded to a manager as a
// quick end-of-day check-in. Unlike the Design Firm Activity report, this always covers
// exactly one day (normally "today") and has no watermark/dedupe logic -- it's fine to
// regenerate the same day's report multiple times, it just always reflects everything
// logged for that date so far. RLS (rep_id = auth.uid()) scopes it to whoever's logged
// in automatically; no category filtering, since a manager wants the whole day's work
// across every account type, not just design firms.
//
// Deliberately excludes new-contact-added rows per explicit user instruction ("No need
// to include adding in contacts") -- a contact's *name* still shows up as who a call/
// email/visit was with, since that's core to reading the activity line, just not as its
// own "contact added" section.

function one<T>(rel: T | T[] | null | undefined): T | null {
  if (Array.isArray(rel)) return rel[0] ?? null;
  return rel ?? null;
}

export interface DailyActivityRow {
  id: string;
  activityType: ActivityType;
  notes: string;
  companyName: string;
  locationName: string;
  city: string | null;
  contactName: string | null;
}

export interface DailyQuoteRow {
  id: string;
  kind: OpportunityKind;
  title: string;
  stage: OpportunityStage;
  amount: number | null;
  companyName: string;
  locationName: string;
}

export interface DailyReportData {
  date: string;
  activity: DailyActivityRow[];
  quotes: DailyQuoteRow[];
  counts: Record<ActivityType, number>;
  quoteTotal: number;
}

export async function getDailyReportData(date: string): Promise<DailyReportData> {
  const supabase = await createClient();

  const [activityRes, quoteRes] = await Promise.all([
    supabase
      .from("visit_notes")
      .select("id, activity_type, notes, contacts(name), locations(name, city, companies(name))")
      .eq("visit_date", date)
      .order("created_at"),
    supabase
      .from("opportunities")
      .select("id, kind, title, stage, amount, locations(name, companies(name))")
      .eq("quote_date", date)
      .order("created_at"),
  ]);

  if (activityRes.error) throw new Error(activityRes.error.message);
  if (quoteRes.error) throw new Error(quoteRes.error.message);

  type ActivityJoin = {
    id: string;
    activity_type: ActivityType;
    notes: string;
    contacts: { name: string } | { name: string }[] | null;
    locations:
      | { name: string; city: string | null; companies: { name: string } | { name: string }[] | null }
      | { name: string; city: string | null; companies: { name: string } | { name: string }[] | null }[]
      | null;
  };
  const activity: DailyActivityRow[] = ((activityRes.data ?? []) as unknown as ActivityJoin[]).map((r) => {
    const loc = one(r.locations);
    const company = one(loc?.companies);
    const contact = one(r.contacts);
    return {
      id: r.id,
      activityType: r.activity_type,
      notes: r.notes,
      companyName: company?.name ?? "",
      locationName: loc?.name ?? "",
      city: loc?.city ?? null,
      contactName: contact?.name ?? null,
    };
  });

  type QuoteJoin = {
    id: string;
    kind: OpportunityKind;
    title: string;
    stage: OpportunityStage;
    amount: number | null;
    locations:
      | { name: string; companies: { name: string } | { name: string }[] | null }
      | { name: string; companies: { name: string } | { name: string }[] | null }[]
      | null;
  };
  const quotes: DailyQuoteRow[] = ((quoteRes.data ?? []) as unknown as QuoteJoin[]).map((r) => {
    const loc = one(r.locations);
    const company = one(loc?.companies);
    return {
      id: r.id,
      kind: r.kind,
      title: r.title,
      stage: r.stage,
      amount: r.amount,
      companyName: company?.name ?? "",
      locationName: loc?.name ?? "",
    };
  });

  const counts: Record<ActivityType, number> = { visit: 0, call: 0, email: 0 };
  for (const a of activity) counts[a.activityType] += 1;
  const quoteTotal = quotes.reduce((sum, q) => sum + (q.amount ?? 0), 0);

  return { date, activity, quotes, counts, quoteTotal };
}
