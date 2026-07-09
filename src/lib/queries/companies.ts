import { createClient } from "@/lib/supabase/server";
import type { CompanyCategory, CompanyRollup, Company, Location } from "@/lib/types";

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

  return ((companies ?? []) as Company[]).map((company) => ({
    company,
    rollup: rollupByCompany.get(company.id),
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
