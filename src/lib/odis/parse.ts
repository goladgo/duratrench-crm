// Parses text copied from the ODIS "Project Search" table (app.duratrench.com/project-search).
//
// Browsers paste a table selection in one of two shapes, and we don't know which one ODIS
// produces, so both are handled:
//   1. Tab mode   - one row per line, cells separated by tabs (empty cells preserved).
//   2. Record mode - one cell per line. Every row starts with a numeric ID line and ends
//      with a "$" price line, so rows are found by anchoring on those, which survives
//      blank cells (e.g. no Follow Up By date).

export interface OdisRow {
  odisId: string;
  name: string;
  followUpBy: string | null; // ISO yyyy-mm-dd
  lastModified: string | null; // ISO yyyy-mm-dd
  bidder: string | null;
  status: string | null;
  price: number | null;
}

export interface ParseResult {
  rows: OdisRow[];
  warnings: string[];
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

const DATE_RE = /^([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2}),\s*(\d{4})$/;
const ID_RE = /^\d{3,7}$/;
const PRICE_RE = /^-?\$\s?-?[\d,]+(\.\d+)?$/;

const HEADER_LABELS = ["id", "project name", "follow up by", "last modified", "bidder", "status", "price"];

export function parseOdisDate(raw: string): string | null {
  const m = DATE_RE.exec(raw.trim());
  if (!m) return null;
  const month = MONTHS[m[1].toLowerCase()];
  if (!month) return null;
  const day = Number(m[2]);
  if (day < 1 || day > 31) return null;
  return `${m[3]}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseOdisPrice(raw: string): number | null {
  const cleaned = raw.replace(/[$,\s]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function clean(s: string | undefined): string | null {
  const t = (s ?? "").trim();
  return t ? t : null;
}

// ---- Tab mode -------------------------------------------------------------------------

type Column = "id" | "name" | "follow" | "last" | "bidder" | "status" | "price";

const DEFAULT_COLUMNS: Column[] = ["id", "name", "follow", "last", "bidder", "status", "price"];

function columnForHeader(label: string): Column | null {
  switch (label.trim().toLowerCase()) {
    case "id": return "id";
    case "project name": return "name";
    case "follow up by": return "follow";
    case "last modified": return "last";
    case "bidder": return "bidder";
    case "status": return "status";
    case "price": return "price";
    default: return null;
  }
}

function parseTabMode(lines: string[], warnings: string[]): OdisRow[] {
  let columns = DEFAULT_COLUMNS;
  const rows: OdisRow[] = [];

  for (const line of lines) {
    const cells = line.split("\t");
    const mapped = cells.map((c) => columnForHeader(c));
    if (mapped.filter(Boolean).length >= 4) {
      // Header line: use the order the user's table is actually in.
      columns = mapped.map((c) => c ?? ("skip" as Column));
      continue;
    }
    if (!ID_RE.test(cells[0]?.trim() ?? "") && !columns.includes("id")) continue;

    const get = (col: Column) => {
      const i = columns.indexOf(col);
      return i === -1 ? undefined : cells[i];
    };
    const id = get("id")?.trim() ?? "";
    if (!ID_RE.test(id)) continue;

    const name = clean(get("name"));
    if (!name) {
      warnings.push(`Row ${id}: no project name found, skipped.`);
      continue;
    }
    rows.push({
      odisId: id,
      name,
      followUpBy: parseOdisDate(get("follow") ?? ""),
      lastModified: parseOdisDate(get("last") ?? ""),
      bidder: clean(get("bidder")),
      status: clean(get("status")),
      price: parseOdisPrice(get("price") ?? ""),
    });
  }
  return rows;
}

// ---- Record mode ----------------------------------------------------------------------

function isHeaderLine(line: string): boolean {
  return HEADER_LABELS.includes(line.trim().toLowerCase());
}

function parseRecordMode(lines: string[], warnings: string[]): OdisRow[] {
  const cells = lines.map((l) => l.trim()).filter((l) => l && !isHeaderLine(l));

  // Group into records: an ID line starts a record, a price line ends it.
  const records: string[][] = [];
  let current: string[] | null = null;
  for (const cell of cells) {
    if (ID_RE.test(cell) && (current === null || current.length === 0 || PRICE_RE.test(current[current.length - 1]))) {
      if (current) records.push(current);
      current = [cell];
    } else if (current) {
      current.push(cell);
    }
  }
  if (current) records.push(current);

  const rows: OdisRow[] = [];
  for (const rec of records) {
    const id = rec[0];
    const rest = rec.slice(1);
    const last = rest[rest.length - 1];
    const hasPrice = last !== undefined && PRICE_RE.test(last);
    const price = hasPrice ? parseOdisPrice(last) : null;
    const body = hasPrice ? rest.slice(0, -1) : rest;

    // body = name, [dates 0-2], bidder, status  (positional from both ends)
    if (body.length < 1) {
      warnings.push(`Row ${id}: incomplete, skipped.`);
      continue;
    }
    const name = body[0];
    const tail = body.slice(1);
    const dates: string[] = [];
    const others: string[] = [];
    for (const t of tail) {
      if (parseOdisDate(t)) dates.push(t);
      else others.push(t);
    }
    const status = others.length >= 1 ? others[others.length - 1] : null;
    const bidder = others.length >= 2 ? others[others.length - 2] : null;

    // Last Modified is always present in ODIS; Follow Up By is the optional one.
    let followUpBy: string | null = null;
    let lastModified: string | null = null;
    if (dates.length >= 2) {
      followUpBy = parseOdisDate(dates[0]);
      lastModified = parseOdisDate(dates[1]);
    } else if (dates.length === 1) {
      lastModified = parseOdisDate(dates[0]);
    }

    if (!hasPrice) warnings.push(`Row ${id} (${name}): no price found.`);
    rows.push({ odisId: id, name, followUpBy, lastModified, bidder, status, price });
  }
  return rows;
}

// ---- Entry point ----------------------------------------------------------------------

export function parseOdisPaste(text: string): ParseResult {
  const warnings: string[] = [];
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim() !== "");

  const tabbed = lines.filter((l) => l.includes("\t")).length >= Math.max(1, Math.floor(lines.length / 2));
  let rows = tabbed ? parseTabMode(lines, warnings) : parseRecordMode(lines, warnings);

  // If the first mode found nothing, try the other before giving up.
  if (rows.length === 0) {
    rows = tabbed ? parseRecordMode(lines, warnings) : parseTabMode(lines, warnings);
  }

  // De-duplicate by ODIS ID (last occurrence wins).
  const byId = new Map<string, OdisRow>();
  for (const r of rows) byId.set(r.odisId, r);
  rows = [...byId.values()];

  if (rows.length === 0) {
    warnings.push(
      "Couldn't find any projects in that text. Copy the table rows from ODIS Project Search (including the ID column) and paste again."
    );
  }
  return { rows, warnings };
}
