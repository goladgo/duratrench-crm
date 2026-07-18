"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface FormState {
  error?: string;
  success?: boolean;
}

export async function createProject(_prevState: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();
  const redirectTo = String(formData.get("redirectTo") ?? "");

  if (!name) return { error: "Project name is required." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data, error } = await supabase.from("projects").insert({ name, rep_id: user.id }).select("id").single();

  if (error) return { error: error.message };

  revalidatePath("/");
  if (redirectTo) redirect(redirectTo.replace(":id", data.id));
  return { success: true };
}

export async function updateProjectDetails(_prevState: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const specifyingCompanyId = String(formData.get("specifying_company_id") ?? "").trim() || null;

  if (!id) return { error: "Missing project." };
  if (!name) return { error: "Project name is required." };

  const supabase = await createClient();
  const { data: existing, error: existingError } = await supabase
    .from("projects")
    .select("specifying_company_id")
    .eq("id", id)
    .single();
  if (existingError) return { error: existingError.message };

  const { error } = await supabase
    .from("projects")
    .update({ name, notes, specifying_company_id: specifyingCompanyId })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath(`/projects/${id}`);
  revalidatePath("/");
  if (existing?.specifying_company_id) revalidatePath(`/companies/${existing.specifying_company_id}`);
  if (specifyingCompanyId) revalidatePath(`/companies/${specifyingCompanyId}`);
  return { success: true };
}

export async function markProjectLost(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("projects").update({ stage: "lost" }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/projects/${id}`);
  revalidatePath("/");
  return {};
}

export async function reopenProject(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({ stage: "quoted", winning_opportunity_id: null, won_at: null })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/projects/${id}`);
  revalidatePath("/");
  return {};
}

// Declaring a winner marks that quote as won and removes the other competing quotes
// on this project entirely (per how the rep wants losing quotes handled — cleared out
// rather than kept around marked "lost").
export async function declareProjectWinner(projectId: string, winningOpportunityId: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data: quotes, error: quotesError } = await supabase
    .from("opportunities")
    .select("id, location_id")
    .eq("project_id", projectId);
  if (quotesError) return { error: quotesError.message };

  const losingIds = (quotes ?? []).map((q) => q.id).filter((qid) => qid !== winningOpportunityId);

  if (losingIds.length > 0) {
    const { error: deleteError } = await supabase.from("opportunities").delete().in("id", losingIds);
    if (deleteError) return { error: deleteError.message };
  }

  const { error: winError } = await supabase.from("opportunities").update({ stage: "won" }).eq("id", winningOpportunityId);
  if (winError) return { error: winError.message };

  const { error: projectError } = await supabase
    .from("projects")
    .update({ stage: "won", winning_opportunity_id: winningOpportunityId, won_at: new Date().toISOString() })
    .eq("id", projectId);
  if (projectError) return { error: projectError.message };

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/");
  revalidatePath("/reports");
  return {};
}

export async function deleteProject(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/");
  redirect("/");
}
