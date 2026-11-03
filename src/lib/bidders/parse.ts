// Parses text copied from the ODIS "Bidders - <project>" window (columns: Name, Company, Phone,
// Email, Credit Checked, Actions). The same BidderRow shape comes back from the screenshot reader,
// so everything after this point doesn't care which way the bidders were captured.
//
// Pasted tables arrive either one row per line (tab-separated) or one cell per line, so both are
// handled. In the one-cell-per-line shape a row is: name, company, [phone], [email].

export interface BidderRow {
  name: string;
  company: string;
  phone: string | null;
  email: string | null;
}

export interface BidderParseResult {
  rows: BidderRow[];
  warnings: string[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?1?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}(\s*(x|ext\.?)\s*\d+)?$/i;
const PARTIAL_PHONE_RE = /^\(?\d{3}\)?[\s.-]?\d{3}-$/;
const FOUR_DIGITS_RE = /^\d{4}$/;

const HEADER_WORDS = new Set([
  "name",
  "company",
  "phone",
  "email",
  "credit checked",
  "credit",
  "checked",
  "actions",
  "done",
  "add bidder",
  "+ add bidder",
]);

function isNoise(line: string): boolean {
  const l = line.trim().toLowerCase();
  if (!l) return true;
  if (HEADER_WORDS.has(l)) return true;
  if (l.startsWith("bidders -") || l.startsWith("bidders –") || l === "bidders") return true;
  // Icon-only cells (edit pencil / remove dash) sometimes paste as a lone dash.
  if (/^[-–—_]$/.test(l)) return true;
  return false;
}

function cleanPhone(p: string | undefined): string | null {
  const t = (p ?? "").trim();
  return t ? t : null;
}

function cleanEmail(e: string | undefined): string | null {
  const t = (e ?? "").trim();
  return t && EMAIL_RE.test(t) ? t : null;
}

// ---- Tab mode ---------------------------------------------------------------------------

function parseTabMode(lines: string[]): BidderRow[] {
  let order = ["name", "company", "phone", "email"];
  const rows: BidderRow[] = [];
  for (const line of lines) {
    const cells = line.split("\t").map((c) => c.trim());
    const lowered = cells.map((c) => c.toLowerCase());
    if (lowered.includes("name") && lowered.includes("company")) {
      order = lowered.map((c) => (["name", "company", "phone", "email"].includes(c) ? c : "skip"));
      continue;
    }
    const get = (key: string) => {
      const i = order.indexOf(key);
      return i === -1 ? undefined : cells[i];
    };
    const name = (get("name") ?? "").trim();
    if (!name || isNoise(name)) continue;
    rows.push({
      name,
      company: (get("company") ?? "").trim(),
      phone: cleanPhone(get("phone")),
      email: cleanEmail(get("email")),
    });
  }
  return rows;
}

// ---- One-cell-per-line mode ---------------------------------------------------------------

function parseLineMode(rawLines: string[]): BidderRow[] {
  // Re-join phone numbers that wrapped across two lines: "(770) 505-" + "6575".
  const lines: string[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    const cur = rawLines[i].trim();
    const next = rawLines[i + 1]?.trim();
    if (PARTIAL_PHONE_RE.test(cur) && next && FOUR_DIGITS_RE.test(next)) {
      lines.push(cur + next);
      i++;
    } else {
      lines.push(cur);
    }
  }

  const rows: BidderRow[] = [];
  let texts: string[] = [];
  let phone: string | null = null;
  let email: string | null = null;

  const flush = () => {
    if (texts.length >= 1) {
      rows.push({ name: texts[0], company: texts[1] ?? "", phone, email });
    }
    texts = [];
    phone = null;
    email = null;
  };

  for (const line of lines) {
    if (isNoise(line)) continue;
    if (EMAIL_RE.test(line)) {
      if (email) flush();
      email = line;
    } else if (PHONE_RE.test(line)) {
      if (phone) flush();
      phone = line;
    } else {
      // A new text cell after a phone/email, or a third text cell, means the next row started.
      if (phone || email || texts.length >= 2) flush();
      texts.push(line);
    }
  }
  flush();
  return rows;
}

export function parseBidderPaste(text: string): BidderParseResult {
  const warnings: string[] = [];
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim() !== "");

  const tabbed = lines.filter((l) => l.includes("\t")).length >= Math.max(1, Math.floor(lines.length / 2));
  let rows = tabbed ? parseTabMode(lines) : parseLineMode(lines);
  if (rows.length === 0) rows = tabbed ? parseLineMode(lines) : parseTabMode(lines);

  // De-duplicate: same email, or same name + company when there's no email.
  const seen = new Set<string>();
  rows = rows.filter((r) => {
    const key = r.email ? r.email.toLowerCase() : `${r.name.toLowerCase()}|${r.company.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  for (const r of rows) {
    if (!r.company) warnings.push(`${r.name}: no company found.`);
  }
  if (rows.length === 0) {
    warnings.push(
      "Couldn't find any bidders in that text. In ODIS, open the project's Bidders window, select the table, copy, and paste again, or paste a screenshot."
    );
  }
  return { rows, warnings };
}
