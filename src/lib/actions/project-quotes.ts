"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { findContactByName, type ContactLite } from "@/lib/quotes/contact-match";
import type { OpportunityStage } from "@/lib/types";
import type { FormState } from "@/lib/actions/opportunities";

const STAGES: OpportunityStage[] = ["quoted", "negotiating", "won", "lost"];

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// Finds or creates the person at a branch. A name that matches someone already there (ignoring
// case and extra spaces) reuses them, filling in phone/email only where those were blank, so
// typing "john smith" never makes a duplicate. Otherwise a new contact is created at the branch;
// the first person added at a branch becomes its primary contact.
async function resolveContact(
  supabase: SupabaseClient,
  repId: string,
  locationId: string,
  person: { name: string; phone: string | null; email: string | null }
): Promise<{ contactId: string | null; created?: boolean; error?: string }> {
  const { data: existing, error: contactsError } = await supabase
    .from("contacts")
    .select("id, name, phone, email")
    .eq("location_id", locationId);
  if (contactsError) return { contactId: null, error: contactsError.message };

  const rows = (existing ?? []) as { id: string; name: string; phone: string | null; email: string | null }[];
  const match = findContactByName(rows, person.name);
  if (match) {
    const patch: Record<string, string> = {};
    if (person.phone && !match.phone) patch.phone = person.phone;
    if (person.email && !match.email) patch.email = person.email;
    if (Object.keys(patch).length > 0) {
      await supabase.from("contacts").update(patch).eq("id", match.id);
    }
    return { contactId: match.id };
  }

  const { data: created, error: createError } = await supabase
    .from("contacts")
    .insert({
      location_id: locationId,
      name: person.name,
      phone: person.phone,
      email: person.email,
      is_primary: rows.length === 0,
      rep_id: repId,
    })
    .select("id")
    .single();
  if (createError) return { contactId: null, error: `Couldn't add ${person.name}: ${createError.message}` };
  return { contactId: created.id, created: true };
}

// Called when a branch is picked in the Add Quote dialog, so the "person quoting" field can
// suggest people already at that branch. Read-only; RLS limits it to the rep's own contacts.
export async function getLocationContacts(locationId: string): Promise<ContactLite[]> {
  if (!locationId) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("id, name, title, phone, email")
    .eq("location_id", locationId)
    .order("is_primary", { ascending: false })
    .order("name");
  if (error) return [];
  return (data ?? []) as ContactLite[];
}

// Adds a quote to a project from the Projects page. The person quoting is typed in by name:
// if someone with that name already exists at the branch they're reused, otherwise a new
// contact is created at that branch in the same save, so the contact never has to be added first.
export async function createQuoteForProject(_prev: FormState, formData: FormData): Promise<FormState> {
  const projectId = String(formData.get("project_id") ?? "").trim();
  const locationId = String(formData.get("location_id") ?? "").trim();
  const contactName = String(formData.get("contact_name") ?? "").trim();
  const contactPhone = String(formData.get("contact_phone") ?? "").trim() || null;
  const contactEmail = String(formData.get("contact_email") ?? "").trim() || null;
  const productLine = String(formData.get("product_line") ?? "").trim() || null;
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const amount = amountRaw ? Number(amountRaw) : null;
  const stageRaw = String(formData.get("stage") ?? "quoted") as OpportunityStage;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!projectId) return { error: "Missing project." };
  if (!locationId) return { error: "Choose the distributor branch that quoted it." };
  if (amountRaw && (amount === null || Number.isNaN(amount) || amount < 0)) {
    return { error: "Amount must be a positive number." };
  }
  if (!STAGES.includes(stageRaw)) return { error: "Pick a valid stage." };
  const stage = stageRaw;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", projectId)
    .maybeSingle();
  if (projectError || !project) return { error: "Couldn't find that project." };

  // Resolve the person quoting: reuse an existing contact at this branch, or create one.
  let contactId: string | null = null;
  if (contactName) {
    const resolved = await resolveContact(supabase, user.id, locationId, {
      name: contactName,
      phone: contactPhone,
      email: contactEmail,
    });
    if (resolved.error) return { error: resolved.error };
    contactId = resolved.contactId;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("opportunities")
    .insert({
      location_id: locationId,
      contact_id: contactId,
      project_id: projectId,
      kind: "quote",
      title: project.name,
      product_line: productLine,
      amount,
      stage,
      notes,
      rep_id: user.id,
    })
    .select("id")
    .single();
  if (insertError) return { error: insertError.message };

  // Same rule as the location-page quote form: a quote saved as "won" promotes its project.
  // (It does not delete competing quotes; that stays a deliberate action on the trophy button.)
  if (stage === "won") {
    const { error: winError } = await supabase
      .from("projects")
      .update({ stage: "won", winning_opportunity_id: inserted.id, won_at: new Date().toISOString() })
      .eq("id", projectId);
    if (winError) return { error: winError.message };
    revalidatePath("/reports");
  }

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/locations/${locationId}`);
  revalidatePath("/");
  return { success: true };
}

// "Who quoted this?" on an existing quote. For the times a request comes in from someone who isn't
// in the CRM yet and there was no time to add them first: quote it now, attach the person later.
// Typing a new name creates them at the quote's own branch; an existing name is reused.
export async function setQuoteContact(_prev: FormState, formData: FormData): Promise<FormState> {
  const opportunityId = String(formData.get("opportunity_id") ?? "").trim();
  const contactName = String(formData.get("contact_name") ?? "").trim();
  const contactPhone = String(formData.get("contact_phone") ?? "").trim() || null;
  const contactEmail = String(formData.get("contact_email") ?? "").trim() || null;

  if (!opportunityId) return { error: "Missing quote." };
  if (!contactName) return { error: "Type who quoted it." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: opp, error: oppError } = await supabase
    .from("opportunities")
    .select("id, location_id, project_id")
    .eq("id", opportunityId)
    .maybeSingle();
  if (oppError || !opp) return { error: "Couldn't find that quote." };

  const resolved = await resolveContact(supabase, user.id, opp.location_id, {
    name: contactName,
    phone: contactPhone,
    email: contactEmail,
  });
  if (resolved.error || !resolved.contactId) return { error: resolved.error ?? "Couldn't save that person." };

  const { error: updateError } = await supabase
    .from("opportunities")
    .update({ contact_id: resolved.contactId })
    .eq("id", opportunityId);
  if (updateError) return { error: updateError.message };

  if (opp.project_id) revalidatePath(`/projects/${opp.project_id}`);
  revalidatePath("/projects");
  revalidatePath(`/locations/${opp.location_id}`);
  revalidatePath("/");
  return { success: true };
}
