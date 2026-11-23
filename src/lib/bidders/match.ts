import type { BidderRow } from "./parse";
import { normalizePersonName } from "../quotes/contact-match";

export type BidderCategory = "distributor" | "contractor";

export interface CompanyRef {
  id: string;
  name: string;
  category: string;
}
export interface LocationRef {
  id: string;
  company_id: string | null;
  name: string;
  city: string | null;
}
export interface ContactRef {
  id: string;
  location_id: string;
  name: string;
  email: string | null;
}

export interface BranchOption {
  id: string;
  name: string;
  city: string | null;
}

// One pasted bidder, plus what the CRM already knows about them.
export interface BidderPlanItem {
  key: string;
  row: BidderRow;
  // Your own Eric'sons teammates show in ODIS's bidder list too; they're skipped by default.
  internal: boolean;
  company: { id: string; name: string; category: string } | null;
  branches: BranchOption[];
  // The text after "Company - " in ODIS, e.g. "Santa Ana" for "Core & Main - Santa Ana".
  branchHint: string | null;
  // Company name with the branch part stripped, used when a new company has to be created.
  newCompanyName: string;
  guessedCategory: BidderCategory | null;
  existingContact: { id: string; name: string } | null;
  // Default dropdown value: "skip" | "loc:<id>" | "new-branch" | "new-company" | "" (user must pick).
  defaultChoice: string;
  needsChoice: boolean;
}

// ---- Names ------------------------------------------------------------------------------

export function normalizeCompany(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[.,'’]/g, "")
    .replace(/\b(inc|llc|llp|corp|corporation|company|co|ltd|the)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// "Core & Main - Santa Ana" -> company "Core & Main", branch hint "Santa Ana". Only a spaced dash
// splits, so "Smith-Jones Supply" stays whole. The last dash wins if there are several.
export function splitCompany(raw: string): { base: string; hint: string | null } {
  const text = raw.trim();
  const parts = text.split(/\s[-–—]\s/);
  if (parts.length < 2) return { base: text, hint: null };
  const hint = parts[parts.length - 1].trim();
  const base = parts.slice(0, -1).join(" - ").trim();
  return base && hint ? { base, hint } : { base: text, hint: null };
}

export function isInternalBidder(row: BidderRow): boolean {
  return /eric\W?sons/i.test(row.company) || /@eric-sons\.com$/i.test(row.email ?? "");
}

// ---- Distributor vs contractor ------------------------------------------------------------------

const CONTRACTOR_WORDS =
  /\b(construction|constructors?|contracting|contractors?|builders?|building|engineering|mechanical|electric|electrical|paving|grading|concrete|excavation|excavating|plumbing & mechanical|plumbing and mechanical|landscap\w*|utilities|pipeline|pipelines|development)\b/;
const DISTRIBUTOR_WORDS =
  /\b(supply|supplies|waterworks|water works|distribut\w*|wholesale|core and main|ferguson|hajoca|pace|slakey|famcon|winwater|hd supply|white cap)\b/;

// Returns a category only when the company name points clearly one way; otherwise null so the
// preview asks. A name that matches both ("Pipe & Supply Construction") is treated as unclear.
export function guessCategory(companyName: string): BidderCategory | null {
  const n = normalizeCompany(companyName);
  const contractor = CONTRACTOR_WORDS.test(n);
  const distributor = DISTRIBUTOR_WORDS.test(n);
  if (contractor && !distributor) return "contractor";
  if (distributor && !contractor) return "distributor";
  return null;
}

// ---- Matching against the CRM -------------------------------------------------------------------

function tokens(s: string): string[] {
  return normalizeCompany(s).split(" ").filter(Boolean);
}

export function matchCompany(base: string, companies: CompanyRef[]): CompanyRef | null {
  const target = normalizeCompany(base);
  if (!target) return null;
  const targetTokens = new Set(tokens(base));

  let best: { c: CompanyRef; score: number } | null = null;
  for (const c of companies) {
    const norm = normalizeCompany(c.name);
    if (!norm) continue;
    if (norm === target) return c;
    const ct = new Set(tokens(c.name));
    const [small, big] = ct.size <= targetTokens.size ? [ct, targetTokens] : [targetTokens, ct];
    if (small.size === 0 || [...small].join("").length < 4) continue;
    if ([...small].every((t) => big.has(t))) {
      const score = small.size;
      if (!best || score > best.score) best = { c, score };
    }
  }
  return best?.c ?? null;
}

function branchMatchesHint(l: LocationRef, hint: string): boolean {
  const h = normalizeCompany(hint);
  if (!h) return false;
  const city = normalizeCompany(l.city ?? "");
  const name = normalizeCompany(l.name);
  return (city !== "" && (city.includes(h) || h.includes(city))) || name.includes(h);
}

function findExistingContact(
  row: BidderRow,
  contacts: ContactRef[],
  locationId: string | null
): { id: string; name: string } | null {
  const email = row.email?.toLowerCase();
  if (email) {
    const byEmail = contacts.find((c) => c.email?.toLowerCase() === email);
    if (byEmail) return { id: byEmail.id, name: byEmail.name };
  }
  if (locationId) {
    const target = normalizePersonName(row.name);
    const byName = contacts.find((c) => c.location_id === locationId && normalizePersonName(c.name) === target);
    if (byName) return { id: byName.id, name: byName.name };
  }
  return null;
}

export function planBidders(
  rows: BidderRow[],
  data: { companies: CompanyRef[]; locations: LocationRef[]; contacts: ContactRef[] }
): BidderPlanItem[] {
  return rows.map((row, i) => {
    const internal = isInternalBidder(row);
    const { base, hint } = splitCompany(row.company);
    const company = internal ? null : matchCompany(base, data.companies);
    const branches: BranchOption[] = company
      ? data.locations
          .filter((l) => l.company_id === company.id)
          .map((l) => ({ id: l.id, name: l.name, city: l.city }))
      : [];

    let defaultChoice = "";
    if (internal) {
      defaultChoice = "skip";
    } else if (company) {
      if (hint) {
        const hits = data.locations.filter((l) => l.company_id === company.id && branchMatchesHint(l, hint));
        defaultChoice = hits.length === 1 ? `loc:${hits[0].id}` : hits.length === 0 ? "new-branch" : "";
      } else if (branches.length === 1) {
        defaultChoice = `loc:${branches[0].id}`;
      } else if (branches.length === 0) {
        defaultChoice = "new-branch";
      }
    } else {
      defaultChoice = "new-company";
    }

    const guessedCategory = company
      ? company.category === "distributor"
        ? "distributor"
        : company.category === "contractor"
          ? "contractor"
          : null
      : internal
        ? null
        : guessCategory(base);

    const locId = defaultChoice.startsWith("loc:") ? defaultChoice.slice(4) : null;
    const needsChoice =
      !internal && (defaultChoice === "" || (defaultChoice === "new-company" && guessedCategory === null));

    return {
      key: String(i),
      row,
      internal,
      company: company ? { id: company.id, name: company.name, category: company.category } : null,
      branches,
      branchHint: hint,
      newCompanyName: base,
      guessedCategory,
      existingContact: findExistingContact(row, data.contacts, locId),
      defaultChoice,
      needsChoice,
    };
  });
}
