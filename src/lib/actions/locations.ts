"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { DistributorType, LocationStatus, TerritoryRegion } from "@/lib/types";

export interface FormState {
  error?: string;
  success?: boolean;
}

export async function createLocation(_prevState: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();
  const companyId = String(formData.get("company_id") ?? "").trim() || null;
  const address = String(formData.get("address") ?? "").trim() || null;
  const city = String(formData.get("city") ?? "").trim() || null;
  const state = String(formData.get("state") ?? "").trim() || null;
  const zip = String(formData.get("zip") ?? "").trim() || null;
  const distributorType = (String(formData.get("distributor_type") ?? "").trim() || null) as DistributorType | null;
  const territoryRegion = String(formData.get("territory_region") ?? "") as TerritoryRegion;
  const status = String(formData.get("status") ?? "prospect") as LocationStatus;
  const redirectTo = String(formData.get("redirectTo") ?? "");

  if (!name) return { error: "Name is required." };
  if (!["socal", "vegas"].includes(territoryRegion)) return { error: "Choose a territory region." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data, error } = await supabase
    .from("locations")
    .insert({
      name,
      company_id: companyId,
      address,
      city,
      state,
      zip,
      distributor_type: distributorType,
      territory_region: territoryRegion,
      status,
      rep_id: user.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/locations");
  if (companyId) revalidatePath(`/companies/${companyId}`);

  if (redirectTo) redirect(redirectTo.replace(":id", data.id));
  return { success: true };
}

export async function updateLocationStatus(locationId: string, status: LocationStatus) {
  const supabase = await createClient();
  const { error } = await supabase.from("locations").update({ status }).eq("id", locationId);
  if (error) throw new Error(error.message);
  revalidatePath(`/locations/${locationId}`);
  revalidatePath("/locations");
}
