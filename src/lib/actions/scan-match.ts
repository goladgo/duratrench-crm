"use server";

import { createClient } from "@/lib/supabase/server";
import type { Company, LocationWithCompany } from "@/lib/types";

export interface ScanMatchResult {
  location: LocationWithCompany | null;
  company: Company | null;
}

// Looks for an existing company/location that a scanned card's company + city
// likely belongs to, so scanning at a known branch doesn't create a duplicate.
export async function matchScan(company: string, city: string): Promise<ScanMatchResult> {
  const supabase = await createClient();
  const companyName = company.trim();
  const cityName = city.trim();

  let companyMatch: Company | null = null;
  if (companyName) {
    const { data } = await supabase.from("companies").select("*").ilike("name", `%${companyName}%`).limit(1);
    companyMatch = (data?.[0] as Company) ?? null;
  }

  let locationMatch: LocationWithCompany | null = null;
  if (companyMatch) {
    let query = supabase
      .from("locations")
      .select("*, companies(id, name, category)")
      .eq("company_id", companyMatch.id);
    if (cityName) query = query.ilike("city", `%${cityName}%`);
    const { data } = await query.limit(1);
    locationMatch = (data?.[0] as LocationWithCompany) ?? null;
  } else if (companyName) {
    // No parent company matched — check for an independent location (no company_id) with a similar name.
    let query = supabase
      .from("locations")
      .select("*, companies(id, name, category)")
      .ilike("name", `%${companyName}%`);
    if (cityName) query = query.ilike("city", `%${cityName}%`);
    const { data } = await query.limit(1);
    locationMatch = (data?.[0] as LocationWithCompany) ?? null;
  }

  return { location: locationMatch, company: companyMatch };
}
