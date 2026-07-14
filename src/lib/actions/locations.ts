"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TERRITORY_OPTIONS } from "@/lib/territory";
import { defaultStatusForCategory } from "@/lib/location-status";
import type { CompanyCategory, DistributorType, LocationStatus, TerritoryRegion } from "@/lib/types";

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
  let status = String(formData.get("status") ?? "prospect") as LocationStatus;
  const redirectTo = String(formData.get("redirectTo") ?? "");

  if (!name) return { error: "Name is required." };
  if (!TERRITORY_OPTIONS.some((o) => o.value === territoryRegion)) return { error: "Choose a territory region." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  // Distributors don't have a "prospect" state — coerce server-side too, in case the
  // client sent a stale/incorrect value (e.g. no company selected yet when the form
  // was rendered).
  if (companyId) {
    const { data: companyRow } = await supabase.from("companies").select("category").eq("id", companyId).single();
    const category = (companyRow?.category as CompanyCategory | undefined) ?? null;
    if (category === "distributor" && status === "prospect") status = defaultStatusForCategory(category);
  }

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

  revalidatePath("/");
  if (companyId) revalidatePath(`/companies/${companyId}`);

  if (redirectTo) redirect(redirectTo.replace(":id", data.id));
  return { success: true };
}

export async function updateLocationStatus(
  locationId: string,
  status: LocationStatus,
  companyId?: string | null
): Promise<{ error?: string } | void> {
  const supabase = await createClient();
  const { error } = await supabase.from("locations").update({ status }).eq("id", locationId);
  if (error) return { error: error.message };
  revalidatePath(`/locations/${locationId}`);
  revalidatePath("/");
  if (companyId) revalidatePath(`/companies/${companyId}`);
}

// Deleting a location cascades to its contacts, visit notes, and opportunities via FK.
export async function deleteLocation(locationId: string, companyId: string | null) {
  const supabase = await createClient();
  const { error } = await supabase.from("locations").delete().eq("id", locationId);
  if (error) return { error: error.message };
  revalidatePath("/");
  if (companyId) revalidatePath(`/companies/${companyId}`);
  redirect(companyId ? `/companies/${companyId}` : "/");
}

export async function updateLunchLearn(
  locationId: string,
  completedAt: string | null,
  scheduledAt: string | null
): Promise<{ error?: string } | void> {
  const supabase = await createClient();

  const updates: { lunch_learn_completed_at: string | null; lunch_learn_scheduled_at: string | null; status?: LocationStatus } = {
    lunch_learn_completed_at: completedAt,
    lunch_learn_scheduled_at: scheduledAt,
  };

  // Completing a Lunch & Learn is what promotes a design firm/contractor from
  // Prospect to Active. Only promote from Prospect — leave an explicit Inactive (a
  // rep's deliberate "not interested" call) alone, and don't touch Active either.
  if (completedAt) {
    const { data: existing, error: fetchError } = await supabase
      .from("locations")
      .select("status, company_id")
      .eq("id", locationId)
      .single();
    if (fetchError) return { error: fetchError.message };
    if (existing.status === "prospect") updates.status = "active";
    if (existing.company_id) revalidatePath(`/companies/${existing.company_id}`);
  }

  const { error } = await supabase.from("locations").update(updates).eq("id", locationId);
  if (error) return { error: error.message };
  revalidatePath(`/locations/${locationId}`);
  revalidatePath("/");
}
