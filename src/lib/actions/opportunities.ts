"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { OpportunityKind, OpportunityStage } from "@/lib/types";

export interface FormState {
  error?: string;
  success?: boolean;
}

// Resolves the project a quote should link to: an existing project id picked from
// the dropdown, a brand-new project created on the spot from a typed name, or none.
async function resolveProjectId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  formData: FormData,
  repId: string
): Promise<{ projectId: string | null; error?: string }> {
  const newProjectName = String(formData.get("new_project_name") ?? "").trim();
  if (newProjectName) {
    const { data, error } = await supabase
      .from("projects")
      .insert({ name: newProjectName, rep_id: repId })
      .select("id")
      .single();
    if (error) return { projectId: null, error: error.message };
    return { projectId: data.id };
  }

  const projectId = String(formData.get("project_id") ?? "").trim();
  return { projectId: projectId || null };
}

export async function createOpportunity(_prevState: FormState, formData: FormData): Promise<FormState> {
  const locationId = String(formData.get("location_id") ?? "");
  const contactId = String(formData.get("contact_id") ?? "").trim() || null;
  const kind = String(formData.get("kind") ?? "quote") as OpportunityKind;
  const title = String(formData.get("title") ?? "").trim();
  const productLine = String(formData.get("product_line") ?? "").trim() || null;
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const amount = amountRaw ? Number(amountRaw) : null;
  const stage = String(formData.get("stage") ?? "quoted") as OpportunityStage;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!locationId) return { error: "Choose a location first." };
  if (!title) return { error: "Title is required." };
  if (amountRaw && Number.isNaN(amount)) return { error: "Amount must be a number." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  let projectId: string | null = null;
  if (kind === "quote") {
    const resolved = await resolveProjectId(supabase, formData, user.id);
    if (resolved.error) return { error: resolved.error };
    projectId = resolved.projectId;
  }

  const { error } = await supabase.from("opportunities").insert({
    location_id: locationId,
    contact_id: contactId,
    project_id: projectId,
    kind,
    title,
    product_line: productLine,
    amount,
    stage,
    notes,
    rep_id: user.id,
  });

  if (error) return { error: error.message };

  revalidatePath(`/locations/${locationId}`);
  revalidatePath("/");
  if (projectId) revalidatePath(`/projects/${projectId}`);
  return { success: true };
}

export async function updateOpportunity(_prevState: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  const locationId = String(formData.get("location_id") ?? "");
  const contactId = String(formData.get("contact_id") ?? "").trim() || null;
  const kind = String(formData.get("kind") ?? "quote") as OpportunityKind;
  const title = String(formData.get("title") ?? "").trim();
  const productLine = String(formData.get("product_line") ?? "").trim() || null;
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const amount = amountRaw ? Number(amountRaw) : null;
  const stage = String(formData.get("stage") ?? "quoted") as OpportunityStage;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!id) return { error: "Missing quote/spec." };
  if (!locationId) return { error: "Choose a location first." };
  if (!title) return { error: "Title is required." };
  if (amountRaw && Number.isNaN(amount)) return { error: "Amount must be a number." };

  const supabase = await createClient();

  let projectUpdate: { project_id: string | null } | Record<string, never> = {};
  if (kind === "quote") {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not signed in." };
    const resolved = await resolveProjectId(supabase, formData, user.id);
    if (resolved.error) return { error: resolved.error };
    projectUpdate = { project_id: resolved.projectId };
  }

  const { error } = await supabase
    .from("opportunities")
    .update({ contact_id: contactId, kind, title, product_line: productLine, amount, stage, notes, ...projectUpdate })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath(`/locations/${locationId}`);
  revalidatePath("/");
  if ("project_id" in projectUpdate && projectUpdate.project_id) revalidatePath(`/projects/${projectUpdate.project_id}`);
  return { success: true };
}

export async function updateOpportunityStage(id: string, locationId: string, stage: OpportunityStage) {
  const supabase = await createClient();
  const { error } = await supabase.from("opportunities").update({ stage }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/locations/${locationId}`);
}

export async function deleteOpportunity(id: string, locationId: string, companyId?: string | null): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("opportunities").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/locations/${locationId}`);
  revalidatePath("/");
  if (companyId) revalidatePath(`/companies/${companyId}`);
  return {};
}
