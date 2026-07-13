import { createClient } from "@/lib/supabase/server";
import type { CompanyCategory, CompanyRollup, Company, Location } from "@/lib/types";

// Summary of Lunch & Learn status across a company's offices, for the list-card
// overview. Only surfaces completed sessions (most recent one wins), since that's
// what reps want to see at a glance — "have we done this firm's L&L yet?"
export interface CompanyLunchLearn {
  status: "completed" | "none";
  date: string | null;
  branchName: string | null;
  branchCity: string | null;
}

function summarizeLunchLearn(
  locations: Pick<Location, "id" | "company_id" | "name" | "city" | "lunch_learn_completed_at">[]
): Map<string, CompanyLunchLearn> {
  const map = new Map<string, CompanyLunchLearn>();
  for (const loc of locations) {
    if (!loc.company_id || !loc.lunch_learn_completed_at) continue;
    const existing = map.get(loc.company_id);
    if (!existing || (existing.date && loc.lunch_learn_completed_at > existing.date)) {
      map.set(loc.company_id, {
        status: "completed",
        date: loc.lunch_learn_completed_at,
        branchName: loc.name,
        branchCity: loc.city,
      });
    }
  }
  return map;
}

export async function listCompanies(categories: CompanyCategory[], search?: string) {
  const supabase = await createClient();

  let companiesQuery = supabase.from("companies").select("*").in("category", categories).order("name");
  if (search) companiesQuery = companiesQuery.ilike("name", `%${search}%`);

  const [{ data: companies, error: companiesError }, { data: rollups, error: rollupsError }] =
    await Promise.all([companiesQuery, supabase.from("company_rollups").select("*")]);

  if (companiesError) throw new Error(companiesError.message);
  if (rollupsError) throw new Error(rollupsError.message);

  const rollupByCompany = new Map(
    ((rollups ?? []) as CompanyRollup[]).map((r) => [r.company_id, r])
  );

  const companyIds = (companies ?? []).map((c) => c.id);
  let lunchLearnByCompany = new Map<string, CompanyLunchLearn>();
  if (companyIds.length > 0) {
    const { data: locs, error: locsError } = await supabase
      .from("locations")
      .select("id, company_id, name, city, lunch_learn_completed_at")
      .in("company_id", companyIds);
    if (locsError) throw new Error(locsError.message);
    lunchLearnByCompany = summarizeLunchLearn(
      (locs ?? []) as Pick<Location, "id" | "company_id" | "name" | "city" | "lunch_learn_completed_at">[]
    );
  }

  return ((companies ?? []) as Company[]).map((company) => ({
    company,
    rollup: rollupByCompany.get(company.id),
    lunchLearn:
      lunchLearnByCompany.get(company.id) ??
      ({ status: "none", date: null, branchName: null, branchCity: null } as CompanyLunchLearn),
  }));
}

// Per-branch overview stats shown on the parent company profile page — last visit
// and a quick quote/spec count + dollar total, so a rep can see at a glance which
// office needs attention without opening each one.
export interface LocationStats {
  lastVisitDate: string | null;
  opportunityCount: number;
  opportunityTotal: number;
}

function summarizeLocationStats(
  locationIds: string[],
  visits: { location_id: string; visit_date: string }[],
  opportunities: { location_id: string; amount: number | null }[]
): Map<string, LocationStats> {
  const map = new Map<string, LocationStats>();
  for (const id of locationIds) {
    map.set(id, { lastVisitDate: null, opportunityCount: 0, opportunityTotal: 0 });
  }

  for (const v of visits) {
    const stats = map.get(v.location_id);
    if (!stats) continue;
    if (!stats.lastVisitDate || v.visit_date > stats.lastVisitDate) stats.lastVisitDate = v.visit_date;
  }

  for (const o of opportunities) {
    const stats = map.get(o.location_id);
    if (!stats) continue;
    stats.opportunityCount += 1;
    stats.opportunityTotal += o.amount ?? 0;
  }

  return map;
}

export async function getCompany(id: string) {
  const supabase = await createClient();

  const [{ data: company, error: companyError }, { data: rollup, error: rollupError }, { data: locations, error: locationsError }] =
    await Promise.all([
      supabase.from("companies").select("*").eq("id", id).single(),
      supabase.from("company_rollups").select("*").eq("company_id", id).maybeSingle(),
      supabase.from("locations").select("*").eq("company_id", id).order("name"),
    ]);

  if (companyError) throw new Error(companyError.message);
  if (rollupError) throw new Error(rollupError.message);
  if (locationsError) throw new Error(locationsError.message);

  const locationIds = (locations ?? []).map((l) => l.id);
  let locationStats = new Map<string, LocationStats>();
  if (locationIds.length > 0) {
    const [{ data: visitRows, error: visitsError }, { data: oppRows, error: oppsError }] = await Promise.all([
      supabase.from("visit_notes").select("location_id, visit_date").in("location_id", locationIds),
      supabase.from("opportunities").select("location_id, amount").in("location_id", locationIds),
    ]);
    if (visitsError) throw new Error(visitsError.message);
    if (oppsError) throw new Error(oppsError.message);

    locationStats = summarizeLocationStats(
      locationIds,
      (visitRows ?? []) as { location_id: string; visit_date: string }[],
      (oppRows ?? []) as { location_id: string; amount: number | null }[]
    );
  }

  return {
    company: company as Company,
    rollup: rollup as CompanyRollup | null,
    locations: (locations ?? []) as Location[],
    locationStats,
  };
}

export async function listAllCompaniesForPicker() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("companies").select("id, name, category").order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as Pick<Company, "id" | "name" | "category">[];
}
