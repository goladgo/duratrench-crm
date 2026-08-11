import { createClient } from "@/lib/supabase/server";
import type {
  CompanyCategory,
  CompanyRollup,
  Company,
  Location,
  DesignFirmAcrossReps,
  CrossRepContact,
  CrossRepLocation,
} from "@/lib/types";

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

// Per-branch overview stats shown on the parent company profile page — last visit,
// a quick quote/spec count + dollar total, and a contact count, so a rep can see at a
// glance which office needs attention (or still needs a contact at all) without
// opening each one.
export interface LocationStats {
  lastVisitDate: string | null;
  opportunityCount: number;
  opportunityTotal: number;
  contactCount: number;
}

function summarizeLocationStats(
  locationIds: string[],
  visits: { location_id: string; visit_date: string }[],
  opportunities: { location_id: string; amount: number | null }[],
  contacts: { location_id: string }[]
): Map<string, LocationStats> {
  const map = new Map<string, LocationStats>();
  for (const id of locationIds) {
    map.set(id, { lastVisitDate: null, opportunityCount: 0, opportunityTotal: 0, contactCount: 0 });
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

  for (const c of contacts) {
    const stats = map.get(c.location_id);
    if (!stats) continue;
    stats.contactCount += 1;
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
    const [
      { data: visitRows, error: visitsError },
      { data: oppRows, error: oppsError },
      { data: contactRows, error: contactsError },
    ] = await Promise.all([
      supabase.from("visit_notes").select("location_id, visit_date").in("location_id", locationIds),
      supabase.from("opportunities").select("location_id, amount").in("location_id", locationIds),
      supabase.from("contacts").select("location_id").in("location_id", locationIds),
    ]);
    if (visitsError) throw new Error(visitsError.message);
    if (oppsError) throw new Error(oppsError.message);
    if (contactsError) throw new Error(contactsError.message);

    locationStats = summarizeLocationStats(
      locationIds,
      (visitRows ?? []) as { location_id: string; visit_date: string }[],
      (oppRows ?? []) as { location_id: string; amount: number | null }[],
      (contactRows ?? []) as { location_id: string }[]
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

// Cross-rep visibility for design firms only (civil_engineering / landscape_architecture)
// -- backs the "show all reps" checkbox on /firms and /companies/[id]. Distributor and
// contractor data is intentionally never exposed this way (see migration 0014's comment
// for the rationale: this is a deliberate, narrow carve-out of RLS for one specific,
// user-requested benefit -- seeing whether another rep already has a contact or ran a
// Lunch & Learn at a firm -- not a general cross-rep data leak).
//
// Each rep's copy of a firm stays its own row here (not merged into one card per firm
// name) since there's no shared identity linking, say, Albert's "Kimley-Horn" company
// row to Dave's -- merging would need fuzzy name-matching logic that's out of scope.
type DesignFirmAcrossRepsRow = {
  company_id: string;
  company_name: string;
  category: CompanyCategory;
  rep_id: string;
  rep_email: string;
  location_count: number | string;
  contact_count: number | string;
  last_visit_date: string | null;
  lunch_learn_completed_at: string | null;
};

export async function listAllDesignFirmsAcrossReps(): Promise<DesignFirmAcrossReps[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_all_design_firms_across_reps");
  if (error) throw new Error(error.message);
  return ((data ?? []) as DesignFirmAcrossRepsRow[]).map((r) => ({
    companyId: r.company_id,
    companyName: r.company_name,
    category: r.category,
    repId: r.rep_id,
    repEmail: r.rep_email,
    // Postgres bigint counts can come back as strings over PostgREST -- normalize to number.
    locationCount: Number(r.location_count),
    contactCount: Number(r.contact_count),
    lastVisitDate: r.last_visit_date,
    lunchLearnCompletedAt: r.lunch_learn_completed_at,
  }));
}

type DesignFirmLocationRow = {
  location_id: string;
  location_name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  status: Location["status"];
  lunch_learn_scheduled_at: string | null;
  lunch_learn_completed_at: string | null;
  rep_id: string;
  rep_email: string;
  last_visit_date: string | null;
  contacts: CrossRepContact[] | null;
};

// Every location on file for a design firm with this exact name (case/whitespace
// insensitive), across every rep. `excludeRepId` drops the viewing rep's own locations
// since those are already shown in the page's normal "Your Offices" section -- this is
// purely the "what do OTHER reps have" addition.
export async function getDesignFirmLocationsAcrossReps(
  companyName: string,
  excludeRepId?: string
): Promise<CrossRepLocation[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_design_firm_locations_by_name", {
    p_company_name: companyName,
  });
  if (error) throw new Error(error.message);
  const rows = ((data ?? []) as DesignFirmLocationRow[]).map((r) => ({
    locationId: r.location_id,
    locationName: r.location_name,
    address: r.address,
    city: r.city,
    state: r.state,
    status: r.status,
    lunchLearnScheduledAt: r.lunch_learn_scheduled_at,
    lunchLearnCompletedAt: r.lunch_learn_completed_at,
    repId: r.rep_id,
    repEmail: r.rep_email,
    lastVisitDate: r.last_visit_date,
    contacts: r.contacts ?? [],
  }));
  return excludeRepId ? rows.filter((r) => r.repId !== excludeRepId) : rows;
}
