"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { OpportunityKind, OpportunityStage } from "@/lib/types";

export interface FormState {
  error?: string;
  success?: boolean;
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

  const { error } = await supabase.from("opportunities").insert({
    location_id: locationId,
    contact_id: contactId,
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
  return { success: true };
}

export async function updateOpportunityStage(id: string, locationId: string, stage: OpportunityStage) {
  const supabase = await createClient();
  const { error } = await supabase.from("opportunities").update({ stage }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/locations/${locationId}`);
}
