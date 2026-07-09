"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface FormState {
  error?: string;
  success?: boolean;
}

export async function createContact(_prevState: FormState, formData: FormData): Promise<FormState> {
  const locationId = String(formData.get("location_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const isPrimary = formData.get("is_primary") === "on";

  if (!locationId) return { error: "Missing location." };
  if (!name) return { error: "Name is required." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase.from("contacts").insert({
    location_id: locationId,
    name,
    title,
    phone,
    email,
    notes,
    is_primary: isPrimary,
    rep_id: user.id,
  });

  if (error) return { error: error.message };

  revalidatePath(`/locations/${locationId}`);
  return { success: true };
}
