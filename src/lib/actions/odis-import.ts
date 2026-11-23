"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { parseOdisPaste } from "@/lib/odis/parse";
import { diffOdisRows, odisToCrmStage, type ExistingProject, type ImportItem } from "@/lib/odis/diff";

export type OdisPreviewResult =
  | { error: string }
  | { items: ImportItem[]; warnings: string[] };

const PROJECT_COLUMNS =
  "id, name, stage, odis_id, odis_status, odis_bidder, odis_price, odis_follow_up_date, odis_last_modified";

// Step 1: parse the pasted text and compare it with the CRM. Writes nothing.
export async function previewOdisImport(text: string): Promise<OdisPreviewResult> {
  if (!text.trim()) return { error: "Paste the ODIS table first." };
  if (text.length > 500_000) return { error: "That paste is too large. Paste just the table rows." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { rows, warnings } = parseOdisPaste(text);
  if (rows.length === 0) return { error: warnings[warnings.length - 1] ?? "No projects found in that text." };

  const { data, error } = await supabase.from("projects").select(PROJECT_COLUMNS);
  if (error) return { error: error.message };

  const existing = ((data ?? []) as unknown as (Omit<ExistingProject, "odis_price"> & { odis_price: number | string | null })[]).map(
    (p) => ({ ...p, odis_price: p.odis_price == null ? null : Number(p.odis_price) })
  ) as ExistingProject[];

  return { items: diffOdisRows(rows, existing), warnings };
}

// ---- Apply ----------------------------------------------------------------------------

const odisRowSchema = z.object({
  odisId: z.string().regex(/^\d{3,7}$/),
  name: z.string().min(1).max(300),
  followUpBy: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  lastModified: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  bidder: z.string().max(200).nullable(),
  status: z.string().max(100).nullable(),
  price: z.number().finite().nullable(),
});

const decisionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("update"), projectId: z.string().uuid() }),
  z.object({ type: z.literal("link"), projectId: z.string().uuid() }),
  z.object({ type: z.literal("create") }),
]);

const applySchema = z
  .array(z.object({ odis: odisRowSchema, decision: decisionSchema }))
  .max(500);

export type OdisApplyDecision = z.infer<typeof decisionSchema>;
export type OdisApplyInput = z.infer<typeof applySchema>;

export type OdisApplyResult =
  | { error: string }
  | { updated: number; linked: number; created: number; failures: string[] };

// Step 2: write the rows the user ticked. Only ODIS-owned fields are touched, plus one stage
// rule: a quoted project that ODIS says is Lost becomes lost. A "Sold" row never auto-wins a
// project, because winning needs a winning distributor (declared in the CRM) and deletes the
// competing quotes.
export async function applyOdisImport(input: OdisApplyInput): Promise<OdisApplyResult> {
  const parsed = applySchema.safeParse(input);
  if (!parsed.success) return { error: "Something in the import looked wrong. Paste and preview again." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const now = new Date().toISOString();
  let updated = 0;
  let linked = 0;
  let created = 0;
  const failures: string[] = [];

  for (const { odis, decision } of parsed.data) {
    const odisFields = {
      odis_id: odis.odisId,
      odis_status: odis.status,
      odis_bidder: odis.bidder,
      odis_price: odis.price,
      odis_follow_up_date: odis.followUpBy,
      odis_last_modified: odis.lastModified,
      odis_synced_at: now,
    };

    if (decision.type === "create") {
      const { error } = await supabase.from("projects").insert({
        name: odis.name,
        stage: odisToCrmStage(odis.status),
        ...odisFields,
      });
      if (error) failures.push(`${odis.name}: ${error.message}`);
      else created++;
      continue;
    }

    // update / link: look at the current stage so we only apply the one safe stage rule.
    const { data: current, error: readError } = await supabase
      .from("projects")
      .select("stage")
      .eq("id", decision.projectId)
      .maybeSingle();
    if (readError || !current) {
      failures.push(`${odis.name}: couldn't find the CRM project.`);
      continue;
    }

    const stagePatch =
      current.stage === "quoted" && odisToCrmStage(odis.status) === "lost" ? { stage: "lost" as const } : {};

    const { error } = await supabase
      .from("projects")
      .update({ ...odisFields, ...stagePatch })
      .eq("id", decision.projectId);
    if (error) {
      failures.push(`${odis.name}: ${error.message}`);
      continue;
    }
    if (decision.type === "link") linked++;
    else updated++;
  }

  revalidatePath("/projects");
  revalidatePath("/");
  revalidatePath("/reports");
  return { updated, linked, created, failures };
}
