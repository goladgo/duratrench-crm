import { createClient } from "@/lib/supabase/server";
import { addDays, formatISODate, parseISODate } from "@/lib/date-utils";
import type { ActivityType, OpportunityKind, OpportunityStage } from "@/lib/types";

// Backs the three read-only weekly overview cards on /reports ("This Week's
// Activities", "This Week's Quotes", "Projects Won This Week"). Unlike the Design Firm
// Activity PDF, these are just in-app summaries -- no export, no watermark, always the
// current week -- so every query here is a plain RLS-scoped read for whoever's logged in.

// Embedded PostgREST relations come back as either an object or a single-element array
// depending on the relationship shape; normalize to a single record (or null).
function one<T>(rel: T | T[] | null | undefined): T | null {
  if (Array.isArray(rel)) return rel[0] ?? null;
  return rel ?? null;
}

export interface CurrentWeek {
  start: string;
  end: string;
}

export interface WeeklyActivityRow {
  id: string;
  activityType: ActivityType;
  date: string;
  notes: string;
  companyName: string;
  locationName: string;
  contactName: string | null;
}

export interface WeeklyActivitySummary {
  rows: WeeklyActivityRow[];
  counts: Record<ActivityType, number>;
}

export async function getWeeklyActivity(week: CurrentWeek): Promise<WeeklyActivitySummary> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("visit_notes")
    .select("id, activity_type, visit_date, notes, contacts(name), locations(name, companies(name))")
    .gte("visit_date", week.start)
    .lte("visit_date", week.end)
    .order("visit_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  type Join = {
    id: string;
    activity_type: ActivityType;
    visit_date: string;
    notes: string;
    contacts: { name: string } | { name: string }[] | null;
    locations:
      | { name: string; companies: { name: string } | { name: string }[] | null }
      | { name: string; companies: { name: string } | { name: string }[] | null }[]
      | null;
  };

  const rows: WeeklyActivityRow[] = ((data ?? []) as unknown as Join[]).map((r) => {
    const loc = one(r.locations);
    const company = one(loc?.companies);
    const contact = one(r.contacts);
    return {
      id: r.id,
      activityType: r.activity_type,
      date: r.visit_date,
      notes: r.notes,
      companyName: company?.name ?? "",
      locationName: loc?.name ?? "",
      contactName: contact?.name ?? null,
    };
  });

  const counts: Record<ActivityType, number> = { visit: 0, call: 0, email: 0 };
  for (const r of rows) counts[r.activityType] += 1;

  return { rows, counts };
}

export interface WeeklyQuoteRow {
  id: string;
  kind: OpportunityKind;
  title: string;
  stage: OpportunityStage;
  amount: number | null;
  productLine: string | null;
  quoteDate: string;
  companyName: string;
  locationName: string;
}

export async function getWeeklyQuotes(week: CurrentWeek): Promise<WeeklyQuoteRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("opportunities")
    .select("id, kind, title, stage, amount, product_line, quote_date, locations(name, companies(name))")
    .gte("quote_date", week.start)
    .lte("quote_date", week.end)
    .order("quote_date", { ascending: false });
  if (error) throw new Error(error.message);

  type Join = {
    id: string;
    kind: OpportunityKind;
    title: string;
    stage: OpportunityStage;
    amount: number | null;
    product_line: string | null;
    quote_date: string;
    locations:
      | { name: string; companies: { name: string } | { name: string }[] | null }
      | { name: string; companies: { name: string } | { name: string }[] | null }[]
      | null;
  };

  return ((data ?? []) as unknown as Join[]).map((r) => {
    const loc = one(r.locations);
    const company = one(loc?.companies);
    return {
      id: r.id,
      kind: r.kind,
      title: r.title,
      stage: r.stage,
      amount: r.amount,
      productLine: r.product_line,
      quoteDate: r.quote_date,
      companyName: company?.name ?? "",
      locationName: loc?.name ?? "",
    };
  });
}

export interface WeeklyWonProjectRow {
  id: string;
  name: string;
  wonAt: string;
  amount: number | null;
  companyName: string | null;
  locationName: string | null;
}

export async function getWeeklyWonProjects(week: CurrentWeek): Promise<WeeklyWonProjectRow[]> {
  const supabase = await createClient();
  // won_at is a timestamptz; widen the upper bound to the start of the day *after* the
  // week ends so a win recorded any time on the last day of the week is still included.
  const weekEndExclusive = formatISODate(addDays(parseISODate(week.end), 1));

  const { data: projectRows, error } = await supabase
    .from("projects")
    .select("id, name, won_at, winning_opportunity_id")
    .eq("stage", "won")
    .gte("won_at", week.start)
    .lt("won_at", weekEndExclusive)
    .order("won_at", { ascending: false });
  if (error) throw new Error(error.message);

  type ProjectRow = { id: string; name: string; won_at: string | null; winning_opportunity_id: string | null };
  const projects = (projectRows ?? []) as ProjectRow[];
  const oppIds = projects.map((p) => p.winning_opportunity_id).filter((id): id is string => !!id);

  type OppInfo = { amount: number | null; companyName: string | null; locationName: string | null };
  const oppById = new Map<string, OppInfo>();

  if (oppIds.length > 0) {
    const { data: oppRows, error: oppError } = await supabase
      .from("opportunities")
      .select("id, amount, locations(name, companies(name))")
      .in("id", oppIds);
    if (oppError) throw new Error(oppError.message);

    type OppJoin = {
      id: string;
      amount: number | null;
      locations:
        | { name: string; companies: { name: string } | { name: string }[] | null }
        | { name: string; companies: { name: string } | { name: string }[] | null }[]
        | null;
    };
    for (const row of (oppRows ?? []) as unknown as OppJoin[]) {
      const loc = one(row.locations);
      const company = one(loc?.companies);
      oppById.set(row.id, { amount: row.amount, companyName: company?.name ?? null, locationName: loc?.name ?? null });
    }
  }

  return projects.map((p) => {
    const opp = p.winning_opportunity_id ? oppById.get(p.winning_opportunity_id) : undefined;
    return {
      id: p.id,
      name: p.name,
      wonAt: p.won_at ?? "",
      amount: opp?.amount ?? null,
      companyName: opp?.companyName ?? null,
      locationName: opp?.locationName ?? null,
    };
  });
}
