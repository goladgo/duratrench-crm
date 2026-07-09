"use server";

import { createClient } from "@/lib/supabase/server";
import type { CompanyCategory, DistributorType, TerritoryRegion } from "@/lib/types";

export interface ResolveScanResult {
  error?: string;
  locationId?: string;
}

// Attaches a scanned contact to a location, creating the location (and, if needed,
// its parent company) first — used when the scanned card is for a stop that isn't
// already in the database.
export async function createFromScan(formData: FormData): Promise<ResolveScanResult> {
  const mode = String(formData.get("mode") ?? "");
  const contactName = String(formData.get("contact_name") ?? "").trim();
  if (!contactName) return { error: "Contact name is required." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  let locationId = String(formData.get("existing_location_id") ?? "");

  if (mode !== "existing_location") {
    let companyId = String(formData.get("existing_company_id") ?? "") || null;

    if (mode === "new_company") {
      const companyName = String(formData.get("company_name") ?? "").trim();
      const category = String(formData.get("category") ?? "distributor") as CompanyCategory;
      if (!companyName) return { error: "Company name is required." };

      const { data: company, error: companyError } = await supabase
        .from("companies")
        .insert({ name: companyName, category, rep_id: user.id })
        .select("id")
        .single();
      if (companyError) return { error: companyError.message };
      companyId = company.id;
    }

    const locationName = String(formData.get("location_name") ?? "").trim();
    const territoryRegion = String(formData.get("territory_region") ?? "socal") as TerritoryRegion;
    const distributorType = (String(formData.get("distributor_type") ?? "").trim() || null) as DistributorType | null;
    if (!locationName) return { error: "Location name is required." };

    const { data: location, error: locationError } = await supabase
      .from("locations")
      .insert({
        rep_id: user.id,
        company_id: companyId,
        name: locationName,
        address: String(formData.get("address") ?? "").trim() || null,
        city: String(formData.get("city") ?? "").trim() || null,
        state: String(formData.get("state") ?? "").trim() || null,
        zip: String(formData.get("zip") ?? "").trim() || null,
        distributor_type: distributorType,
        territory_region: territoryRegion,
        status: "prospect",
      })
      .select("id")
      .single();
    if (locationError) return { error: locationError.message };
    locationId = location.id;
  }

  if (!locationId) return { error: "Missing location." };

  const { error: contactError } = await supabase.from("contacts").insert({
    location_id: locationId,
    name: contactName,
    title: String(formData.get("contact_title") ?? "").trim() || null,
    phone: String(formData.get("contact_phone") ?? "").trim() || null,
    email: String(formData.get("contact_email") ?? "").trim() || null,
    is_primary: formData.get("is_primary") === "on",
    rep_id: user.id,
  });
  if (contactError) return { error: contactError.message };

  return { locationId };
}
