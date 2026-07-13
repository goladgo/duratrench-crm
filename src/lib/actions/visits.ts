"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface FormState {
  error?: string;
  success?: boolean;
}

export async function createVisitNote(_prevState: FormState, formData: FormData): Promise<FormState> {
  const locationId = String(formData.get("location_id") ?? "");
  const contactId = String(formData.get("contact_id") ?? "").trim() || null;
  const visitDate = String(formData.get("visit_date") ?? "").trim() || undefined;
  const notes = String(formData.get("notes") ?? "").trim();
  const followUpDate = String(formData.get("follow_up_date") ?? "").trim() || null;
  const redirectTo = String(formData.get("redirectTo") ?? "");

  if (!locationId) return { error: "Choose a location first." };
  if (!notes) return { error: "Add a note about the visit." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase.from("visit_notes").insert({
    location_id: locationId,
    contact_id: contactId,
    visit_date: visitDate,
    notes,
    follow_up_date: followUpDate,
    rep_id: user.id,
  });

  if (error) return { error: error.message };

  revalidatePath(`/locations/${locationId}`);
  if (redirectTo) redirect(redirectTo);
  return { success: true };
}

export async function updateVisitNote(_prevState: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  const locationId = String(formData.get("location_id") ?? "");
  const contactId = String(formData.get("contact_id") ?? "").trim() || null;
  const visitDate = String(formData.get("visit_date") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const followUpDate = String(formData.get("follow_up_date") ?? "").trim() || null;

  if (!id) return { error: "Missing visit note." };
  if (!locationId) return { error: "Missing location." };
  if (!visitDate) return { error: "Visit date is required." };
  if (!notes) return { error: "Add a note about the visit." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("visit_notes")
    .update({ contact_id: contactId, visit_date: visitDate, notes, follow_up_date: followUpDate })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath(`/locations/${locationId}`);
  return { success: true };
}

// Used by the full-page mobile "Log a Visit" flow, which posts directly to a
// server action (no client JS needed) and always redirects to the next stop.
export async function logVisitAndReturn(formData: FormData) {
  const locationId = String(formData.get("location_id") ?? "");
  const contactId = String(formData.get("contact_id") ?? "").trim() || null;
  const visitDate = String(formData.get("visit_date") ?? "").trim() || undefined;
  const notes = String(formData.get("notes") ?? "").trim();
  const followUpDate = String(formData.get("follow_up_date") ?? "").trim() || null;

  if (!locationId || !notes) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("visit_notes").insert({
    location_id: locationId,
    contact_id: contactId,
    visit_date: visitDate,
    notes,
    follow_up_date: followUpDate,
    rep_id: user.id,
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/locations/${locationId}`);
  redirect("/visits/new?logged=1");
}

export async function deleteVisitNote(id: string, locationId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("visit_notes").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/locations/${locationId}`);
  return {};
}
