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

  return {
    company: company as Company,
    rollup: rollup as CompanyRollup | null,
    locations: (locations ?? []) as Location[],
  };
}

export async function listAllCompaniesForPicker() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("companies").select("id, name, category").order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as Pick<Company, "id" | "name" | "category">[];
}
