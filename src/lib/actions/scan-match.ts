"use server";

import { createClient } from "@/lib/supabase/server";
import type { Company, LocationWithCompany } from "@/lib/types";

export interface ScanMatchResult {
  location: LocationWithCompany | null;
  company: Company | null;
}

// Normalizes a company name so minor OCR/formatting differences (punctuation,
// "&" vs "and" spacing, Inc./Co. suffixes) don't defeat matching against what's
// already in the database.
function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[.,]/g, "")
    .replace(/\b(inc|llc|corp|corporation|company|co|ltd)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function findBestMatch<T>(candidates: T[], getName: (item: T) => string, query: string): T | null {
  const normalizedQuery = normalizeCompanyName(query);
  if (!normalizedQuery) return null;

  let best: T | null = null;
  for (const candidate of candidates) {
    const normalizedName = normalizeCompanyName(getName(candidate));
    if (!normalizedName) continue;
    if (normalizedName === normalizedQuery) return candidate; // exact match wins immediately
    if (!best && (normalizedName.includes(normalizedQuery) || normalizedQuery.includes(normalizedName))) {
      best = candidate;
    }
  }
  return best;
}

// Looks for an existing company/location that a scanned card's company + city
// likely belongs to, so scanning at a known branch doesn't create a duplicate.
export async function matchScan(company: string, city: string): Promise<ScanMatchResult> {
  const supabase = await createClient();
  const companyName = company.trim();
  const cityName = city.trim();

  let companyMatch: Company | null = null;
  if (companyName) {
    const { data } = await supabase.from("companies").select("*");
    companyMatch = findBestMatch((data ?? []) as Company[], (c) => c.name, companyName);
  }

  let locationMatch: LocationWithCompany | null = null;
  if (companyMatch) {
    const { data } = await supabase
      .from("locations")
      .select("*, companies(id, name, category)")
      .eq("company_id", companyMatch.id);
    const candidates = (data ?? []) as LocationWithCompany[];
    locationMatch =
      candidates.find((l) => cityName && l.city && l.city.toLowerCase().includes(cityName.toLowerCase())) ??
      candidates[0] ??
      null;
  } else if (companyName) {
    // No parent company matched — check for an independent location (no company_id) with a similar name.
    const { data } = await supabase.from("locations").select("*, companies(id, name, category)").is("company_id", null);
    locationMatch = findBestMatch((data ?? []) as LocationWithCompany[], (l) => l.name, companyName);
  }

  return { location: locationMatch, company: companyMatch };
}
