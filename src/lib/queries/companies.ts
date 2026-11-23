import { createClient } from "@/lib/supabase/server";
import type {
  CompanyCategory,
  CompanyRollup,
  Company,
  Contact,
  Location,
  DesignFirmAcrossReps,
  CrossRepContact,
  CrossRepLocation,
} from "@/lib/types";

// Summary of Lunch & Learn status across a company's offices, for the list-card
// overview. Only surfaces completed sessions (most recent one wins), since that's
// what reps want to see at a glance — "have we done this firm's L&L yet?"
export interface CompanyLunchLearn {
  status: "completed" | "none";
  date: string | null;
  branchName: string | null;
  branchCity: string | null;
}

function summarizeLunchLearn(
  locations: Pick<Location, "id" | "company_id" | "name" | "city" | "lunch_learn_completed_at">[]
): Map<string, CompanyLunchLearn> {
  const map = new Map<string, CompanyLunchLearn>();
  for (const loc of locations) {
    if (!loc.company_id || !loc.lunch_learn_completed_at) continue;
    const existing = map.get(loc.company_id);
    if (!existing || (existing.date && loc.lunch_learn_completed_at > existing.date)) {
      map.set(loc.company_id, {
        status: "completed",
        date: loc.lunch_learn_completed_at,
        branchName: loc.name,
        branchCity: loc.city,
      });
    }
  }
  return map;
}

export async function listCompanies(categories: CompanyCategory[], search?: string) {
  const supabase = await createClient();

  let companiesQuery = supabase.from("companies").select("*").in("category", categories).order("name");
  if (search) companiesQuery = companiesQuery.ilike("name", `%${search}%`);

  const [{ data: companies, error: companiesError }, { data: rollups, error: rollupsError }] =
    await Promise.all([companiesQuery, supabase.from("company_rollups").select("*")]);

  if (companiesError) throw new Error(companiesError.message);
  if (rollupsError) throw new Error(rollupsError.message);

  const rollupByCompany = new Map(
    ((rollups ?? []) as CompanyRollup[]).map((r) => [r.company_id, r])
  );

  const companyIds = (companies ?? []).map((c) => c.id);
  let lunchLearnByCompany = new Map<string, CompanyLunchLearn>();
  if (companyIds.length > 0) {
    const { data: locs, error: locsError } = await supabase
      .from("locations")
      .select("id, company_id, name, city, lunch_learn_completed_at")
      .in("company_id", companyIds);
    if (locsError) throw new Error(locsError.message);
    lunchLearnByCompany = summarizeLunchLearn(
      (locs ?? []) as Pick<Location, "id" | "company_id" | "name" | "city" | "lunch_learn_completed_at">[]
    );
  }

  return ((companies ?? []) as Company[]).map((company) => ({
    company,
    rollup: rollupByCompany.get(company.id),
    lunchLearn:
      lunchLearnByCompany.get(company.id) ??
      ({ status: "none", date: null, branchName: null, branchCity: null } as CompanyLunchLearn),
  }));
}

// Per-branch overview stats shown on the parent company profile page — last visit,
// a quick quote/spec count + dollar total, and a contact count, so a rep can see at a
// glance which office needs attention (or still needs a contact at all) without
// opening each one.
export interface LocationStats {
  lastVisitDate: string | null;
  opportunityCount: number;
  opportunityTotal: number;
  contactCount: number;
}

function summarizeLocationStats(
  locationIds: string[],
  visits: { location_id: string; visit_date: string }[],
  opportunities: { location_id: string; amount: number | null }[],
  contacts: { location_id: string }[]
): Map<string, LocationStats> {
  const map = new Map<string, LocationStats>();
  for (const id of locationIds) {
    map.set(id, { lastVisitDate: null, opportunityCount: 0, opportunityTotal: 0, contactCount: 0 });
  }

  for (const v of visits) {
    const stats = map.get(v.location_id);
    if (!stats) continue;
    if (!stats.lastVisitDate || v.visit_date > stats.lastVisitDate) stats.lastVisitDate = v.visit_date;
  }

  for (const o of opportunities) {
    const stats = map.get(o.location_id);
    if (!stats) continue;
    stats.opportunityCount += 1;
    stats.opportunityTotal += o.amount ?? 0;
  }

  for (const c of contacts) {
    const stats = map.get(c.location_id);
    if (!stats) continue;
    stats.contactCount += 1;
  }

  return map;
}

export async function getCompany(id: string) {
  const supabase = await createClient();

  const [{ data: company, error: companyError }, { data: rollup, error: rollupError }, { data: locations, error: locationsError }] =
    await Promise.all([
      supabase.from("companies").select("*").eq("id", id).single(),
      supabase.from("company_rollups").select("*").eq("company_id", id).maybeSingle(),
      supabase.from("locations").select("*").eq("company_id", id).order("name"),
    ]);

  if (companyError) throw new Error(companyError.message);
  if (rollupError) throw new Error(rollupError.message);
  if (locationsError) throw new Error(locationsError.message);

  const locationIds = (locations ?? []).map((l) => l.id);
  let locationStats = new Map<string, LocationStats>();
  if (locationIds.length > 0) {
    const [
      { data: visitRows, error: visitsError },
      { data: oppRows, error: oppsError },
      { data: contactRows, error: contactsError },
    ] = await Promise.all([
      supabase.from("visit_notes").select("location_id, visit_date").in("location_id", locationIds),
      supabase.from("opportunities").select("location_id, amount").in("location_id", locationIds),
      supabase.from("contacts").select("location_id").in("location_id", locationIds),
    ]);
    if (visitsError) throw new Error(visitsError.message);
    if (oppsError) throw new Error(oppsError.message);
    if (contactsError) throw new Error(contactsError.message);

    locationStats = summarizeLocationStats(
      locationIds,
      (visitRows ?? []) as { location_id: string; visit_date: string }[],
      (oppRows ?? []) as { location_id: string; amount: number | null }[],
      (contactRows ?? []) as { location_id: string }[]
    );
  }

  return {
    company: company as Company,
    rollup: rollup as CompanyRollup | null,
    locations: (locations ?? []) as Location[],
    locationStats,
  };
}

export async function listAllCompaniesForPicker() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("companies").select("id, name, category").order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as Pick<Company, "id" | "name" | "category">[];
}

// Cross-rep visibility for design firms only (civil_engineering / landscape_architecture)
// -- backs the "show all reps" checkbox on /firms and /companies/[id]. Distributor and
// contractor data is intentionally never exposed this way (see migration 0014's comment
// for the rationale: this is a deliberate, narrow carve-out of RLS for one specific,
// user-requested benefit -- seeing whether another rep already has a contact or ran a
// Lunch & Learn at a firm -- not a general cross-rep data leak).
//
// Each rep's copy of a firm stays its own row here (not merged into one card per firm
// name) since there's no shared identity linking, say, Albert's "Kimley-Horn" company
// row to Dave's -- merging would need fuzzy name-matching logic that's out of scope.
type DesignFirmAcrossRepsRow = {
  company_id: string;
  company_name: string;
  category: CompanyCategory;
  rep_id: string;
  rep_email: string;
  location_count: number | string;
  contact_count: number | string;
  last_visit_date: string | null;
  lunch_learn_completed_at: string | null;
};

export async function listAllDesignFirmsAcrossReps(): Promise<DesignFirmAcrossReps[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_all_design_firms_across_reps");
  if (error) throw new Error(error.message);
  return ((data ?? []) as DesignFirmAcrossRepsRow[]).map((r) => ({
    companyId: r.company_id,
    companyName: r.company_name,
    category: r.category,
    repId: r.rep_id,
    repEmail: r.rep_email,
    // Postgres bigint counts can come back as strings over PostgREST -- normalize to number.
    locationCount: Number(r.location_count),
    contactCount: Number(r.contact_count),
    lastVisitDate: r.last_visit_date,
    lunchLearnCompletedAt: r.lunch_learn_completed_at,
  }));
}

type DesignFirmLocationRow = {
  location_id: string;
  location_name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  status: Location["status"];
  lunch_learn_scheduled_at: string | null;
  lunch_learn_completed_at: string | null;
  rep_id: string;
  rep_email: string;
  last_visit_date: string | null;
  contacts: CrossRepContact[] | null;
};

// Every location on file for a design firm with this exact name (case/whitespace
// insensitive), across every rep. `excludeRepId` drops the viewing rep's own locations
// since those are already shown in the page's normal "Your Offices" section -- this is
// purely the "what do OTHER reps have" addition.
export async function getDesignFirmLocationsAcrossReps(
  companyName: string,
  excludeRepId?: string
): Promise<CrossRepLocation[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_design_firm_locations_by_name", {
    p_company_name: companyName,
  });
  if (error) throw new Error(error.message);
  const rows = ((data ?? []) as DesignFirmLocationRow[]).map((r) => ({
    locationId: r.location_id,
    locationName: r.location_name,
    address: r.address,
    city: r.city,
    state: r.state,
    status: r.status,
    lunchLearnScheduledAt: r.lunch_learn_scheduled_at,
    lunchLearnCompletedAt: r.lunch_learn_completed_at,
    repId: r.rep_id,
    repEmail: r.rep_email,
    lastVisitDate: r.last_visit_date,
    contacts: r.contacts ?? [],
  }));
  return excludeRepId ? rows.filter((r) => r.repId !== excludeRepId) : rows;
}


// ---------------------------------------------------------------------------
// Contacts directory -- backs the combined /contacts tab (design firms + contractors).
//
// Search is deliberately broader than a name filter: a rep looking for "who was that
// guy at Kimley in Irvine" should be able to type "kimley irvine" or "mike" and land on
// the right firm. So every firm is matched against a haystack of its own name PLUS all
// of its branches (name, city, address, zip) PLUS all of its people (name, title, email,
// phone). Every whitespace-separated word must appear somewhere in that haystack (AND
// semantics), which is what makes "kimley irvine" work even though the two words live on
// different rows. Everything is RLS-scoped to the signed-in rep.
// ---------------------------------------------------------------------------
export const DIRECTORY_CATEGORIES: CompanyCategory[] = [
  "civil_engineering",
  "landscape_architecture",
  "contractor",
];

export type DirectoryContact = Pick<Contact, "id" | "location_id" | "name" | "title" | "phone" | "email">;

export interface DirectoryEntry {
  company: Company;
  rollup: CompanyRollup | undefined;
  lunchLearn: CompanyLunchLearn;
  // Branches / people that matched the search words (empty when there's no search, or
  // when the firm only matched on its own name).
  matchedLocations: Location[];
  matchedContacts: (DirectoryContact & { locationLabel: string })[];
}

function norm(v: string | null | undefined) {
  return (v ?? "").toLowerCase();
}

// PostgREST caps a single response at 1000 rows by default -- page through so a large
// directory (hundreds of branches, many contacts) never silently truncates.
async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const pageSize = 1000;
  const out: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return out;
}

export async function listContactsDirectory(search?: string): Promise<DirectoryEntry[]> {
  const supabase = await createClient();

  const companies = await fetchAll<Company>((from, to) =>
    supabase.from("companies").select("*").in("category", DIRECTORY_CATEGORIES).order("name").range(from, to)
  );
  if (companies.length === 0) return [];

  const companyIds = new Set(companies.map((c) => c.id));

  const [rollups, allLocations] = await Promise.all([
    fetchAll<CompanyRollup>((from, to) => supabase.from("company_rollups").select("*").range(from, to)),
    fetchAll<Location>((from, to) =>
      supabase.from("locations").select("*").not("company_id", "is", null).order("name").range(from, to)
    ),
  ]);

  const locations = allLocations.filter((l) => l.company_id && companyIds.has(l.company_id));
  const locationById = new Map(locations.map((l) => [l.id, l]));

  const allContacts = await fetchAll<DirectoryContact>((from, to) =>
    supabase.from("contacts").select("id, location_id, name, title, phone, email").order("name").range(from, to)
  );
  const contacts = allContacts.filter((c) => locationById.has(c.location_id));

  return buildDirectoryEntries({ companies, rollups, locations, contacts, search });
}

// Pure (no I/O) so the matching rules can be unit-tested without a database.
export function buildDirectoryEntries({
  companies,
  rollups,
  locations,
  contacts,
  search,
}: {
  companies: Company[];
  rollups: CompanyRollup[];
  locations: Location[];
  contacts: DirectoryContact[];
  search?: string;
}): DirectoryEntry[] {
  const locationById = new Map(locations.map((l) => [l.id, l]));
  const rollupByCompany = new Map(rollups.map((r) => [r.company_id, r]));
  const lunchLearnByCompany = summarizeLunchLearn(locations);

  const locationsByCompany = new Map<string, Location[]>();
  for (const l of locations) {
    const list = locationsByCompany.get(l.company_id as string) ?? [];
    list.push(l);
    locationsByCompany.set(l.company_id as string, list);
  }
  const contactsByCompany = new Map<string, DirectoryContact[]>();
  for (const c of contacts) {
    const companyId = locationById.get(c.location_id)?.company_id as string;
    const list = contactsByCompany.get(companyId) ?? [];
    list.push(c);
    contactsByCompany.set(companyId, list);
  }

  const words = (search ?? "")
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean);

  const locationText = (l: Location) => [l.name, l.city, l.address, l.zip, l.state].map(norm).join(" ");
  const contactText = (c: DirectoryContact) => [c.name, c.title, c.email, c.phone].map(norm).join(" ");

  const entries: DirectoryEntry[] = [];
  for (const company of companies) {
    const companyLocations = locationsByCompany.get(company.id) ?? [];
    const companyContacts = contactsByCompany.get(company.id) ?? [];

    let matchedLocations: Location[] = [];
    let matchedContacts: DirectoryEntry["matchedContacts"] = [];

    if (words.length > 0) {
      const haystack = [
        norm(company.name),
        ...companyLocations.map(locationText),
        ...companyContacts.map(contactText),
      ].join(" | ");
      if (!words.every((w) => haystack.includes(w))) continue;

      // Surface the specific branches/people behind the match (any word hits) so the
      // card explains *why* it showed up -- skipped when the firm name alone matched.
      const nameText = norm(company.name);
      const nameMatchesAll = words.every((w) => nameText.includes(w));
      if (!nameMatchesAll) {
        // Prefer the rows that satisfy EVERY word together with the firm name ("kimley
        // irvine" -> just the Irvine branch); fall back to any-word hits when no single
        // row does (e.g. "irvine mike" where the two words live on different rows).
        const pick = <T,>(rows: T[], text: (row: T) => string) => {
          const strict = rows.filter((r) => words.every((w) => `${nameText} ${text(r)}`.includes(w)));
          return strict.length > 0 ? strict : rows.filter((r) => words.some((w) => text(r).includes(w)));
        };
        matchedLocations = pick(companyLocations, locationText);
        const contactFull = (c: DirectoryContact) => {
          const loc = locationById.get(c.location_id);
          return `${loc ? locationText(loc) : ""} ${contactText(c)}`;
        };
        matchedContacts = pick(companyContacts, contactFull).map((c) => {
          const loc = locationById.get(c.location_id);
          return { ...c, locationLabel: loc ? [loc.city, loc.name].filter(Boolean)[0] ?? loc.name : "" };
        });
      }
    }

    entries.push({
      company,
      rollup: rollupByCompany.get(company.id),
      lunchLearn:
        lunchLearnByCompany.get(company.id) ??
        ({ status: "none", date: null, branchName: null, branchCity: null } as CompanyLunchLearn),
      matchedLocations,
      matchedContacts,
    });
  }
  return entries;
}
