import { createClient } from "@/lib/supabase/server";
import { addDays, formatISODate, parseISODate } from "@/lib/date-utils";
import type { ActivityType, OpportunityKind, OpportunityStage } from "@/lib/types";

// Backs the read-only weekly overview cards on /reports ("This Week's Activities" -- a
// merged, dated feed of visits/calls/emails (visit_notes) AND quotes/specs (opportunities)
// -- "This Week's Quotes", "Projects Won This Week"). Unlike the Design Firm Activity PDF,
// these are just in-app summaries -- no export, no watermark -- and the range is whatever
// the /reports page's range toggle passes in (the current Mon-Sun week, or the last two
// full Mon-Sun weeks), not always "this week" despite the type/function names below.

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

type LocationJoin =
  | { name: string; companies: { name: string } | { name: string }[] | null }
  | { name: string; companies: { name: string } | { name: string }[] | null }[]
  | null;

function companyAndLocationName(loc: LocationJoin): { companyName: string; locationName: string } {
  const l = one(loc);
  const company = one(l?.companies);
  return { companyName: company?.name ?? "", locationName: l?.name ?? "" };
}

// One entry in the merged "This Week's Activities" feed -- either a visit/call/email
// (visit_notes) or a quote/spec (opportunities), sorted together by date so the card reads
// as one chronological rundown instead of two disconnected lists. Quote-only fields are
// null on activity rows and vice versa.
export type FeedEntryType = ActivityType | "opportunity";

export interface WeeklyFeedItem {
  id: string;
  entryType: FeedEntryType;
  date: string;
  createdAt: string;
  companyName: string;
  locationName: string;
  contactName: string | null;
  notes: string | null;
  // Set only when entryType === "opportunity".
  opportunityKind: OpportunityKind | null;
  stage: OpportunityStage | null;
  amount: number | null;
  title: string | null;
}

export interface WeeklyActivityFeed {
  items: WeeklyFeedItem[];
  counts: { visit: number; call: number; email: number; opportunity: number };
}

export async function getWeeklyActivityFeed(week: CurrentWeek): Promise<WeeklyActivityFeed> {
  const supabase = await createClient();

  const [activityRes, quoteRes] = await Promise.all([
    supabase
      .from("visit_notes")
      .select("id, activity_type, visit_date, notes, created_at, contacts(name), locations(name, companies(name))")
      .gte("visit_date", week.start)
      .lte("visit_date", week.end)
      .order("visit_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("opportunities")
      .select(
        "id, kind, title, stage, amount, quote_date, notes, created_at, contacts(name), locations(name, companies(name))"
      )
      .gte("quote_date", week.start)
      .lte("quote_date", week.end)
      .order("quote_date", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);
  if (activityRes.error) throw new Error(activityRes.error.message);
  if (quoteRes.error) throw new Error(quoteRes.error.message);

  type ActivityJoin = {
    id: string;
    activity_type: ActivityType;
    visit_date: string;
    notes: string;
    created_at: string;
    contacts: { name: string } | { name: string }[] | null;
    locations: LocationJoin;
  };
  type OpportunityJoin = {
    id: string;
    kind: OpportunityKind;
    title: string;
    stage: OpportunityStage;
    amount: number | null;
    quote_date: string;
    notes: string | null;
    created_at: string;
    contacts: { name: string } | { name: string }[] | null;
    locations: LocationJoin;
  };

  const activityItems: WeeklyFeedItem[] = ((activityRes.data ?? []) as unknown as ActivityJoin[]).map((r) => {
    const { companyName, locationName } = companyAndLocationName(r.locations);
    return {
      id: r.id,
      entryType: r.activity_type,
      date: r.visit_date,
      createdAt: r.created_at,
      companyName,
      locationName,
      contactName: one(r.contacts)?.name ?? null,
      notes: r.notes,
      opportunityKind: null,
      stage: null,
      amount: null,
      title: null,
    };
  });

  const quoteItems: WeeklyFeedItem[] = ((quoteRes.data ?? []) as unknown as OpportunityJoin[]).map((r) => {
    const { companyName, locationName } = companyAndLocationName(r.locations);
    return {
      id: r.id,
      entryType: "opportunity",
      date: r.quote_date,
      createdAt: r.created_at,
      companyName,
      locationName,
      contactName: one(r.contacts)?.name ?? null,
      notes: r.notes,
      opportunityKind: r.kind,
      stage: r.stage,
      amount: r.amount,
      title: r.title,
    };
  });

  const items = [...activityItems, ...quoteItems].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)
  );

  const counts = { visit: 0, call: 0, email: 0, opportunity: 0 };
  for (const item of items) {
    if (item.entryType === "opportunity") counts.opportunity += 1;
    else counts[item.entryType] += 1;
  }

  return { items, counts };
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
    locations: LocationJoin;
  };

  return ((data ?? []) as unknown as Join[]).map((r) => {
    const { companyName, locationName } = companyAndLocationName(r.locations);
    return {
      id: r.id,
      kind: r.kind,
      title: r.title,
      stage: r.stage,
      amount: r.amount,
      productLine: r.product_line,
      quoteDate: r.quote_date,
      companyName,
      locationName,
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

    type OppJoin = { id: string; amount: number | null; locations: LocationJoin };
    for (const row of (oppRows ?? []) as unknown as OppJoin[]) {
      const { companyName, locationName } = companyAndLocationName(row.locations);
      oppById.set(row.id, { amount: row.amount, companyName: companyName || null, locationName: locationName || null });
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
