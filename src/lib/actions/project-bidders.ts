"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { declareProjectWinner } from "@/lib/actions/projects";
import { defaultStatusForCategory } from "@/lib/location-status";
import { getRepTerritories } from "@/lib/reps";
import { parseBidderPaste, type BidderRow } from "@/lib/bidders/parse";
import {
  normalizeCompany,
  planBidders,
  splitCompany,
  type BidderPlanItem,
  type CompanyRef,
  type ContactRef,
  type LocationRef,
} from "@/lib/bidders/match";
import { findContactByName } from "@/lib/quotes/contact-match";
import type { CompanyCategory, TerritoryRegion } from "@/lib/types";

const client = new Anthropic();

// ---- Read a screenshot ------------------------------------------------------------------------

export type ReadBiddersResult = { error: string } | { rows: BidderRow[] };

// Reads a screenshot of ODIS's Bidders window into rows. Same approach as the business-card scan:
// one vision call with a JSON schema, so the reply is always parseable.
export async function readBiddersFromImage(formData: FormData): Promise<ReadBiddersResult> {
  const mediaType = String(formData.get("mediaType") ?? "image/jpeg");
  const base64Data = String(formData.get("photoBase64") ?? "");
  if (!base64Data) return { error: "No screenshot found." };

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 3000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as "image/jpeg" | "image/png" | "image/webp",
                data: base64Data,
              },
            },
            {
              type: "text",
              text: "This is a screenshot of a Bidders table. List every bidder row with the person's name, company, phone number, and email address exactly as shown. Use an empty string for a field that is blank. Do not include column headers, buttons, or the window title, and do not invent anyone who isn't in the table.",
            },
          ],
        },
      ],
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              bidders: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    company: { type: "string" },
                    phone: { type: "string" },
                    email: { type: "string" },
                  },
                  required: ["name", "company", "phone", "email"],
                  additionalProperties: false,
                },
              },
            },
            required: ["bidders"],
            additionalProperties: false,
          },
        },
      },
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return { error: "Couldn't read that screenshot. Try again." };

    const parsed = JSON.parse(textBlock.text) as {
      bidders: { name: string; company: string; phone: string; email: string }[];
    };
    const rows: BidderRow[] = parsed.bidders
      .map((b) => ({
        name: b.name.trim(),
        company: b.company.trim(),
        phone: b.phone.trim() || null,
        email: b.email.trim() || null,
      }))
      .filter((b) => b.name);
    if (rows.length === 0) return { error: "No bidders found in that screenshot." };
    return { rows };
  } catch {
    return { error: "Couldn't read that screenshot. Try again, or paste the table text instead." };
  }
}

// ---- Preview ----------------------------------------------------------------------------------

export type PreviewBiddersResult =
  | { error: string }
  | { items: BidderPlanItem[]; warnings: string[]; alreadyOnProject: string[] };

// Step 1: turn pasted text (or rows read from a screenshot) into a plan against the CRM. Writes nothing.
export async function previewBidders(
  projectId: string,
  input: { text?: string; rows?: BidderRow[] }
): Promise<PreviewBiddersResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  let rows: BidderRow[];
  let warnings: string[] = [];
  if (input.rows) {
    rows = input.rows;
  } else {
    const text = input.text ?? "";
    if (!text.trim()) return { error: "Paste the bidders first." };
    if (text.length > 200_000) return { error: "That paste is too large. Paste just the bidders table." };
    const parsed = parseBidderPaste(text);
    rows = parsed.rows;
    warnings = parsed.warnings;
  }
  if (rows.length === 0) return { error: warnings[warnings.length - 1] ?? "No bidders found." };

  const [companiesRes, locationsRes, contactsRes, biddersRes] = await Promise.all([
    supabase.from("companies").select("id, name, category"),
    supabase.from("locations").select("id, company_id, name, city"),
    supabase.from("contacts").select("id, location_id, name, email"),
    supabase.from("project_bidders").select("contact_id").eq("project_id", projectId),
  ]);
  const failed = [companiesRes, locationsRes, contactsRes, biddersRes].find((r) => r.error);
  if (failed?.error) return { error: failed.error.message };

  const items = planBidders(rows, {
    companies: (companiesRes.data ?? []) as CompanyRef[],
    locations: (locationsRes.data ?? []) as LocationRef[],
    contacts: (contactsRes.data ?? []) as ContactRef[],
  });

  const onProject = new Set((biddersRes.data ?? []).map((b: { contact_id: string }) => b.contact_id));
  const alreadyOnProject = items.filter((i) => i.existingContact && onProject.has(i.existingContact.id)).map((i) => i.key);

  return { items, warnings, alreadyOnProject };
}

// ---- Apply ------------------------------------------------------------------------------------

const decisionSchema = z.object({
  row: z.object({
    name: z.string().min(1).max(200),
    company: z.string().max(300),
    phone: z.string().max(60).nullable(),
    email: z.string().max(200).nullable(),
  }),
  // "loc:<uuid>" | "new-branch" | "new-company" ("skip" rows are never sent)
  choice: z.string().regex(/^(new-branch|new-company|loc:[0-9a-fA-F-]{36})$/),
  companyId: z.string().uuid().nullable(),
  category: z.enum(["distributor", "contractor"]).nullable(),
});

const applySchema = z.array(decisionSchema).max(100);
export type ApplyBiddersInput = z.infer<typeof applySchema>;

export type ApplyBiddersResult =
  | { error: string }
  | {
      added: number;
      newContacts: number;
      newCompanies: number;
      newBranches: number;
      failures: string[];
    };

// Step 2: save. Every bidder ends up as a contact at a branch (created if needed) and a row in
// project_bidders. Nothing here touches quotes.
export async function applyBidders(projectId: string, input: ApplyBiddersInput): Promise<ApplyBiddersResult> {
  const parsed = applySchema.safeParse(input);
  if (!parsed.success) return { error: "Something in the import looked wrong. Paste and preview again." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: project } = await supabase.from("projects").select("id").eq("id", projectId).maybeSingle();
  if (!project) return { error: "Couldn't find that project." };

  const territory: TerritoryRegion = getRepTerritories(user.email, [])[0] ?? "socal";

  // Within one import, bidders from the same new company/branch share it instead of duplicating.
  const createdCompanies = new Map<string, { id: string; category: CompanyCategory }>();
  const createdBranches = new Map<string, string>();

  let added = 0;
  let newContacts = 0;
  let newCompanies = 0;
  let newBranches = 0;
  const failures: string[] = [];

  for (const d of parsed.data) {
    const { row } = d;
    const { base, hint } = splitCompany(row.company);

    // 1. Resolve the branch.
    let locationId: string | null = null;
    if (d.choice.startsWith("loc:")) {
      locationId = d.choice.slice(4);
    } else {
      let companyId = d.companyId;
      let category: CompanyCategory | null = null;

      if (d.choice === "new-company") {
        if (!d.category) {
          failures.push(`${row.name}: pick distributor or contractor for ${base || "this company"}.`);
          continue;
        }
        const companyKey = normalizeCompany(base || row.company);
        const cached = createdCompanies.get(companyKey);
        if (cached) {
          companyId = cached.id;
          category = cached.category;
        } else {
          const { data: company, error } = await supabase
            .from("companies")
            .insert({ name: base || row.company, category: d.category, rep_id: user.id })
            .select("id")
            .single();
          if (error) {
            failures.push(`${row.name}: couldn't add ${base}. ${error.message}`);
            continue;
          }
          companyId = company.id;
          category = d.category;
          createdCompanies.set(companyKey, { id: company.id, category: d.category });
          newCompanies++;
        }
      } else if (companyId) {
        const { data: c } = await supabase.from("companies").select("category").eq("id", companyId).single();
        category = (c?.category as CompanyCategory | undefined) ?? null;
      }

      const branchKey = `${companyId}|${normalizeCompany(hint ?? "")}|${normalizeCompany(row.company)}`;
      const cachedBranch = createdBranches.get(branchKey);
      if (cachedBranch) {
        locationId = cachedBranch;
      } else {
        const { data: location, error } = await supabase
          .from("locations")
          .insert({
            rep_id: user.id,
            company_id: companyId,
            name: row.company || base,
            city: hint,
            territory_region: territory,
            status: defaultStatusForCategory(category),
          })
          .select("id")
          .single();
        if (error) {
          failures.push(`${row.name}: couldn't add the branch. ${error.message}`);
          continue;
        }
        locationId = location.id;
        createdBranches.set(branchKey, location.id);
        newBranches++;
      }
    }
    if (!locationId) continue;

    // 2. Resolve the contact at that branch: same email, else same name, else create.
    const { data: existing, error: contactsError } = await supabase
      .from("contacts")
      .select("id, name, phone, email")
      .eq("location_id", locationId);
    if (contactsError) {
      failures.push(`${row.name}: ${contactsError.message}`);
      continue;
    }
    const contacts = (existing ?? []) as { id: string; name: string; phone: string | null; email: string | null }[];
    const emailLower = row.email?.toLowerCase() ?? null;
    const match =
      (emailLower ? contacts.find((c) => c.email?.toLowerCase() === emailLower) : undefined) ??
      findContactByName(contacts, row.name);

    let contactId: string;
    if (match) {
      contactId = match.id;
      const patch: Record<string, string> = {};
      if (row.phone && !match.phone) patch.phone = row.phone;
      if (row.email && !match.email) patch.email = row.email;
      if (Object.keys(patch).length > 0) await supabase.from("contacts").update(patch).eq("id", match.id);
    } else {
      const { data: created, error } = await supabase
        .from("contacts")
        .insert({
          location_id: locationId,
          name: row.name,
          phone: row.phone,
          email: row.email,
          is_primary: contacts.length === 0,
          rep_id: user.id,
        })
        .select("id")
        .single();
      if (error) {
        failures.push(`${row.name}: couldn't add the contact. ${error.message}`);
        continue;
      }
      contactId = created.id;
      newContacts++;
    }

    // 3. List them as a bidder on this project (ignore if already listed).
    const { error: bidderError } = await supabase
      .from("project_bidders")
      .upsert(
        { project_id: projectId, contact_id: contactId, rep_id: user.id },
        { onConflict: "project_id,contact_id", ignoreDuplicates: true }
      );
    if (bidderError) {
      failures.push(`${row.name}: ${bidderError.message}`);
      continue;
    }
    added++;
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  revalidatePath("/companies");
  return { added, newContacts, newCompanies, newBranches, failures };
}

// ---- Remove / win -----------------------------------------------------------------------------

export async function removeBidder(bidderId: string, projectId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("project_bidders").delete().eq("id", bidderId);
  if (error) return { error: error.message };
  revalidatePath(`/projects/${projectId}`);
  return {};
}

function parsePrice(raw: string): { value: number | null; error?: string } {
  const cleaned = raw.replace(/[$,\s]/g, "");
  if (!cleaned) return { value: null };
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return { value: null, error: "Sold price must be a positive number." };
  return { value: n };
}

// Marks a bidder as the winner at the price it actually sold for. The bidder gets a quote on the
// project (reusing one at their branch if it exists, otherwise creating it), then the existing
// declare-winner logic runs, which removes the other *quotes*. The bidder list itself is left alone.
export async function declareBidderWinner(
  projectId: string,
  bidderId: string,
  soldPriceRaw: string
): Promise<{ error?: string }> {
  const price = parsePrice(soldPriceRaw);
  if (price.error) return { error: price.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: bidder } = await supabase
    .from("project_bidders")
    .select("id, contact_id, contacts(location_id)")
    .eq("id", bidderId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (!bidder) return { error: "Couldn't find that bidder." };

  const contactRel = bidder.contacts as { location_id: string } | { location_id: string }[] | null;
  const locationId = Array.isArray(contactRel) ? contactRel[0]?.location_id : contactRel?.location_id;
  if (!locationId) return { error: "That bidder has no branch." };

  const { data: project } = await supabase.from("projects").select("id, name").eq("id", projectId).maybeSingle();
  if (!project) return { error: "Couldn't find that project." };

  const { data: quotes } = await supabase
    .from("opportunities")
    .select("id, contact_id")
    .eq("project_id", projectId)
    .eq("location_id", locationId);
  const existing = (quotes ?? []) as { id: string; contact_id: string | null }[];
  const quote = existing.find((q) => q.contact_id === bidder.contact_id) ?? existing[0];

  let quoteId: string;
  if (quote) {
    quoteId = quote.id;
    const patch: Record<string, string | number> = {};
    if (!quote.contact_id) patch.contact_id = bidder.contact_id;
    if (price.value !== null) patch.amount = price.value;
    if (Object.keys(patch).length > 0) {
      const { error } = await supabase.from("opportunities").update(patch).eq("id", quoteId);
      if (error) return { error: error.message };
    }
  } else {
    const { data: inserted, error } = await supabase
      .from("opportunities")
      .insert({
        location_id: locationId,
        contact_id: bidder.contact_id,
        project_id: projectId,
        kind: "quote",
        title: project.name,
        amount: price.value,
        stage: "quoted",
        rep_id: user.id,
      })
      .select("id")
      .single();
    if (error) return { error: error.message };
    quoteId = inserted.id;
  }

  const result = await declareProjectWinner(projectId, quoteId);
  if (result?.error) return result;
  revalidatePath(`/locations/${locationId}`);
  return {};
}

// Lets the sold price be corrected after a project is won (the project's own price is only an
// estimate). Updates the winning quote's amount, which is what the performance tables read.
export async function setSoldPrice(projectId: string, priceRaw: string): Promise<{ error?: string }> {
  const price = parsePrice(priceRaw);
  if (price.error) return { error: price.error };

  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, stage, winning_opportunity_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project || project.stage !== "won" || !project.winning_opportunity_id) {
    return { error: "This project hasn't been marked as won yet." };
  }

  const { error } = await supabase
    .from("opportunities")
    .update({ amount: price.value })
    .eq("id", project.winning_opportunity_id);
  if (error) return { error: error.message };

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  revalidatePath("/reports");
  revalidatePath("/");
  return {};
}
