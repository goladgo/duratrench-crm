"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CompanyCategory } from "@/lib/types";

export interface FormState {
  error?: string;
  success?: boolean;
}

export async function createCompany(_prevState: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "") as CompanyCategory;
  const website = String(formData.get("website") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const redirectTo = String(formData.get("redirectTo") ?? "");

  if (!name) return { error: "Name is required." };
  if (!["distributor", "civil_engineering", "landscape_architecture", "contractor"].includes(category)) {
    return { error: "Choose a valid category." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("companies")
    .insert({ name, category, website, notes, rep_id: user.id });

  if (error) return { error: error.message };

  revalidatePath("/companies");
  revalidatePath("/firms");
  revalidatePath("/contractors");
  if (redirectTo) redirect(redirectTo);
  return { success: true };
}

export async function updateCompany(_prevState: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const website = String(formData.get("website") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!id) return { error: "Missing company id." };
  if (!name) return { error: "Name is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("companies").update({ name, website, notes }).eq("id", id);

  if (error) return { error: error.message };

  revalidatePath(`/companies/${id}`);
  revalidatePath("/companies");
  revalidatePath("/firms");
  revalidatePath("/contractors");
  return { success: true };
}

// Deletes every location under this company first (cascading to their contacts,
// visit notes, and opportunities via FK), then the company itself.
export async function deleteCompany(id: string, category: CompanyCategory) {
  const supabase = await createClient();

  const { error: locationsError } = await supabase.from("locations").delete().eq("company_id", id);
  if (locationsError) return { error: locationsError.message };

  const { error } = await supabase.from("companies").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/companies");
  revalidatePath("/firms");
  revalidatePath("/contractors");
  const destination =
    category === "distributor" ? "/companies" : category === "contractor" ? "/contractors" : "/firms";
  redirect(destination);
}
