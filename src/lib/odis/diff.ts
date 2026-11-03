import type { OdisRow } from "./parse";

export type CrmStage = "quoted" | "won" | "lost";

// The slice of a CRM project the import needs to see.
export interface ExistingProject {
  id: string;
  name: string;
  stage: CrmStage;
  odis_id: string | null;
  odis_status: string | null;
  odis_bidder: string | null;
  odis_price: number | null;
  odis_follow_up_date: string | null;
  odis_last_modified: string | null;
}

export interface Candidate {
  id: string;
  name: string;
}

export type ImportKind = "update" | "link" | "new" | "unchanged" | "ambiguous";

export interface ImportItem {
  odis: OdisRow;
  kind: ImportKind;
  // For update/link/unchanged: the CRM project this row belongs to.
  project: Candidate | null;
  // For "new" / "ambiguous": existing CRM projects (not yet linked) that look similar.
  candidates: Candidate[];
  // Human-readable list of what will change, e.g. "Price $1,000 -> $2,000".
  changes: string[];
  // Things to look at that the import deliberately does NOT change.
  flags: string[];
  // The stage this row would move the project to (null = leave as-is).
  newStage: CrmStage | null;
}

export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokens(s: string): Set<string> {
  return new Set(normalizeName(s).split(" ").filter((t) => t.length > 1));
}

function similarity(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let overlap = 0;
  for (const t of ta) if (tb.has(t)) overlap++;
  return overlap / Math.min(ta.size, tb.size);
}

export function formatMoney(n: number | null): string {
  if (n == null) return "none";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

// ODIS status -> the CRM stage it implies. Draft/Quoted/Sold all mean "still quoted" until the
// rep declares a winning distributor in the CRM; only Lost maps to a stage change on its own.
export function odisToCrmStage(status: string | null): CrmStage {
  return status?.trim().toLowerCase() === "lost" ? "lost" : "quoted";
}

function isSold(status: string | null): boolean {
  const s = status?.trim().toLowerCase();
  return s === "sold" || s === "won" || s === "awarded";
}

function topCandidates(name: string, pool: ExistingProject[], limit = 3): Candidate[] {
  return pool
    .map((p) => ({ p, score: similarity(name, p.name) }))
    .filter((x) => x.score >= 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => ({ id: x.p.id, name: x.p.name }));
}

function describeChanges(row: OdisRow, p: ExistingProject): string[] {
  const out: string[] = [];
  if (row.price !== p.odis_price) out.push(`Price ${formatMoney(p.odis_price)} → ${formatMoney(row.price)}`);
  if ((row.status ?? null) !== p.odis_status) out.push(`ODIS status ${p.odis_status ?? "none"} → ${row.status ?? "none"}`);
  if ((row.followUpBy ?? null) !== p.odis_follow_up_date) out.push(`Follow up ${p.odis_follow_up_date ?? "none"} → ${row.followUpBy ?? "none"}`);
  if ((row.bidder ?? null) !== p.odis_bidder) out.push(`Bidder ${p.odis_bidder ?? "none"} → ${row.bidder ?? "none"}`);
  if ((row.lastModified ?? null) !== p.odis_last_modified) out.push(`Last modified ${p.odis_last_modified ?? "none"} → ${row.lastModified ?? "none"}`);
  return out;
}

function stageFlagsAndChange(row: OdisRow, current: CrmStage): { flags: string[]; newStage: CrmStage | null } {
  const flags: string[] = [];
  let newStage: CrmStage | null = null;

  if (isSold(row.status) && current !== "won") {
    flags.push("Sold in ODIS but not won in the CRM yet. Open the project and pick the winning distributor.");
  }
  if (row.status?.trim().toLowerCase() === "lost" && current === "quoted") {
    newStage = "lost";
  }
  if (current === "lost" && row.status && !["lost"].includes(row.status.trim().toLowerCase())) {
    flags.push(`Marked lost in the CRM but ODIS says ${row.status}.`);
  }
  if (current === "won" && row.status?.trim().toLowerCase() === "lost") {
    flags.push("Won in the CRM but Lost in ODIS. Check which is right.");
  }
  return { flags, newStage };
}

export function diffOdisRows(rows: OdisRow[], existing: ExistingProject[]): ImportItem[] {
  const byOdisId = new Map<string, ExistingProject>();
  for (const p of existing) if (p.odis_id) byOdisId.set(p.odis_id, p);

  const unlinked = existing.filter((p) => !p.odis_id);
  const claimed = new Set<string>(); // CRM project ids already matched in this import

  const items: ImportItem[] = [];

  // Pass 1: rows whose ODIS ID is already linked.
  const remaining: OdisRow[] = [];
  for (const row of rows) {
    const p = byOdisId.get(row.odisId);
    if (!p) {
      remaining.push(row);
      continue;
    }
    claimed.add(p.id);
    const changes = describeChanges(row, p);
    const { flags, newStage } = stageFlagsAndChange(row, p.stage);
    items.push({
      odis: row,
      kind: changes.length === 0 && !newStage ? "unchanged" : "update",
      project: { id: p.id, name: p.name },
      candidates: [],
      changes: newStage ? [...changes, `Stage ${p.stage} → ${newStage}`] : changes,
      flags,
      newStage,
    });
  }

  // Pass 2: exact (normalized) name match against projects that aren't linked yet.
  for (const row of remaining) {
    const norm = normalizeName(row.name);
    const pool = unlinked.filter((p) => !claimed.has(p.id));
    const exact = pool.filter((p) => normalizeName(p.name) === norm);

    if (exact.length === 1) {
      const p = exact[0];
      claimed.add(p.id);
      const { flags, newStage } = stageFlagsAndChange(row, p.stage);
      items.push({
        odis: row,
        kind: "link",
        project: { id: p.id, name: p.name },
        candidates: [],
        changes: [`Link to ODIS #${row.odisId}`, ...describeChanges(row, p), ...(newStage ? [`Stage ${p.stage} → ${newStage}`] : [])],
        flags,
        newStage,
      });
      continue;
    }

    if (exact.length > 1) {
      items.push({
        odis: row,
        kind: "ambiguous",
        project: null,
        candidates: exact.map((p) => ({ id: p.id, name: p.name })),
        changes: [],
        flags: ["More than one CRM project has this name. Pick which one it is."],
        newStage: null,
      });
      continue;
    }

    const { flags } = stageFlagsAndChange(row, "quoted");
    items.push({
      odis: row,
      kind: "new",
      project: null,
      candidates: topCandidates(row.name, pool),
      changes: [],
      flags: flags.filter((f) => f.startsWith("Sold in ODIS")),
      newStage: null,
    });
  }

  // Keep the order the user pasted in.
  const order = new Map(rows.map((r, i) => [r.odisId, i]));
  items.sort((a, b) => (order.get(a.odis.odisId) ?? 0) - (order.get(b.odis.odisId) ?? 0));
  return items;
}
