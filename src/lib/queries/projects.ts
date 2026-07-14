import { createClient } from "@/lib/supabase/server";
import type {
  Company,
  DistributorPerformance,
  DistributorRepPerformance,
  Project,
  ProjectDetail,
  ProjectListItem,
  ProjectQuote,
  WonProjectSummary,
} from "@/lib/types";

type CompanyRef = { id: string; name: string };
type CompanyRefWithCategory = { id: string; name: string; category: string };

export async function listProjectsForDashboard(limit = 50): Promise<ProjectListItem[]> {
  const supabase = await createClient();

  const { data: projectRows, error: projectsError } = await supabase
    .from("projects")
    .select(
      "id, rep_id, name, notes, stage, specifying_company_id, winning_opportunity_id, created_at, companies(id, name)"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (projectsError) throw new Error(projectsError.message);

  type Row = Project & { companies: CompanyRef | CompanyRef[] | null };
  const projects = (projectRows ?? []) as unknown as Row[];

  const projectIds = projects.map((p) => p.id);
  const countByProject = new Map<string, number>();
  if (projectIds.length > 0) {
    const { data: oppRows, error: oppsError } = await supabase
      .from("opportunities")
      .select("project_id")
      .in("project_id", projectIds);
    if (oppsError) throw new Error(oppsError.message);
    for (const o of (oppRows ?? []) as { project_id: string | null }[]) {
      if (!o.project_id) continue;
      countByProject.set(o.project_id, (countByProject.get(o.project_id) ?? 0) + 1);
    }
  }

  return projects.map((p) => {
    const company = Array.isArray(p.companies) ? (p.companies[0] ?? null) : p.companies;
    return {
      id: p.id,
      rep_id: p.rep_id,
      name: p.name,
      notes: p.notes,
      stage: p.stage,
      specifying_company_id: p.specifying_company_id,
      winning_opportunity_id: p.winning_opportunity_id,
      created_at: p.created_at,
      specifying_company: company,
      quote_count: countByProject.get(p.id) ?? 0,
    };
  });
}

export async function getProject(id: string): Promise<ProjectDetail | null> {
  const supabase = await createClient();

  const { data: projectRow, error: projectError } = await supabase
    .from("projects")
    .select(
      "id, rep_id, name, notes, stage, specifying_company_id, winning_opportunity_id, created_at, companies(id, name, category)"
    )
    .eq("id", id)
    .maybeSingle();

  if (projectError) throw new Error(projectError.message);
  if (!projectRow) return null;

  type Row = Project & { companies: CompanyRefWithCategory | CompanyRefWithCategory[] | null };
  const p = projectRow as unknown as Row;
  const company = Array.isArray(p.companies) ? (p.companies[0] ?? null) : p.companies;

  const { data: quoteRows, error: quotesError } = await supabase
    .from("opportunities")
    .select("*, contacts(id, name), locations(id, name, city, companies(id, name))")
    .eq("project_id", id)
    .order("amount", { ascending: false });

  if (quotesError) throw new Error(quotesError.message);

  return {
    id: p.id,
    rep_id: p.rep_id,
    name: p.name,
    notes: p.notes,
    stage: p.stage,
    specifying_company_id: p.specifying_company_id,
    winning_opportunity_id: p.winning_opportunity_id,
    created_at: p.created_at,
    specifying_company: company as Pick<Company, "id" | "name" | "category"> | null,
    quotes: (quoteRows ?? []) as unknown as ProjectQuote[],
  };
}

export async function listProjectsBySpecifyingCompany(
  companyId: string
): Promise<Pick<Project, "id" | "name" | "stage" | "created_at">[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, stage, created_at")
    .eq("specifying_company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Pick<Project, "id" | "name" | "stage" | "created_at">[];
}

export async function listProjectsForPicker(): Promise<Pick<Project, "id" | "name">[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("projects").select("id, name").order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as Pick<Project, "id" | "name">[];
}

export async function listDesignFirmCompaniesForPicker(): Promise<Pick<Company, "id" | "name" | "category">[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("id, name, category")
    .in("category", ["civil_engineering", "landscape_architecture"])
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as Pick<Company, "id" | "name" | "category">[];
}

// Every won project, with the winning branch/company resolved for display. Two-query
// shape (projects, then their winning opportunities) rather than a single embedded
// query, since projects and opportunities have two possible relationships
// (opportunities.project_id and projects.winning_opportunity_id) which PostgREST can't
// disambiguate automatically.
export async function listWonProjects(): Promise<WonProjectSummary[]> {
  const supabase = await createClient();

  const { data: projectRows, error: projectsError } = await supabase
    .from("projects")
    .select("id, name, created_at, winning_opportunity_id")
    .eq("stage", "won")
    .order("created_at", { ascending: false });
  if (projectsError) throw new Error(projectsError.message);

  const projects = (projectRows ?? []) as Pick<Project, "id" | "name" | "created_at" | "winning_opportunity_id">[];
  const opportunityIds = projects.map((p) => p.winning_opportunity_id).filter((id): id is string => !!id);

  type WinningOpp = {
    id: string;
    amount: number | null;
    locations: (Pick<{ id: string; name: string }, "id" | "name"> & { companies: CompanyRef | null }) | null;
  };
  const oppById = new Map<string, WinningOpp>();

  if (opportunityIds.length > 0) {
    const { data: oppRows, error: oppsError } = await supabase
      .from("opportunities")
      .select("id, amount, locations(id, name, companies(id, name))")
      .in("id", opportunityIds);
    if (oppsError) throw new Error(oppsError.message);

    type Row = { id: string; amount: number | null; locations: WinningOpp["locations"] | WinningOpp["locations"][] };
    for (const row of (oppRows ?? []) as unknown as Row[]) {
      const loc = Array.isArray(row.locations) ? (row.locations[0] ?? null) : row.locations;
      oppById.set(row.id, { id: row.id, amount: row.amount, locations: loc });
    }
  }

  return projects.map((p) => {
    const opp = p.winning_opportunity_id ? oppById.get(p.winning_opportunity_id) : undefined;
    const loc = opp?.locations ?? null;
    return {
      id: p.id,
      name: p.name,
      created_at: p.created_at,
      amount: opp?.amount ?? null,
      winner_company_id: loc?.companies?.id ?? null,
      winner_company_name: loc?.companies?.name ?? null,
      winner_location_name: loc?.name ?? null,
    };
  });
}

// Per-distributor scoreboard: how many quotes they've submitted, how many project
// competitions they've won, and the total $ of those wins. Scoped to companies whose
// category is "distributor" since that's who competes head-to-head on a project.
export async function getDistributorPerformance(): Promise<DistributorPerformance[]> {
  const supabase = await createClient();

  const { data: companyRows, error: companiesError } = await supabase
    .from("companies")
    .select("id, name")
    .eq("category", "distributor");
  if (companiesError) throw new Error(companiesError.message);
  const companies = (companyRows ?? []) as CompanyRef[];
  if (companies.length === 0) return [];

  const { data: locationRows, error: locationsError } = await supabase
    .from("locations")
    .select("id, company_id")
    .not("company_id", "is", null);
  if (locationsError) throw new Error(locationsError.message);
  const companyByLocation = new Map(
    ((locationRows ?? []) as { id: string; company_id: string }[]).map((l) => [l.id, l.company_id])
  );

  const { data: quoteRows, error: quotesError } = await supabase
    .from("opportunities")
    .select("id, location_id, amount")
    .eq("kind", "quote");
  if (quotesError) throw new Error(quotesError.message);

  const { data: wonProjectRows, error: wonProjectsError } = await supabase
    .from("projects")
    .select("winning_opportunity_id")
    .eq("stage", "won")
    .not("winning_opportunity_id", "is", null);
  if (wonProjectsError) throw new Error(wonProjectsError.message);
  const winningOpportunityIds = new Set(
    ((wonProjectRows ?? []) as { winning_opportunity_id: string }[]).map((p) => p.winning_opportunity_id)
  );

  const statsByCompany = new Map<string, { quote_count: number; wins_count: number; won_value: number }>();
  for (const q of (quoteRows ?? []) as { id: string; location_id: string; amount: number | null }[]) {
    const companyId = companyByLocation.get(q.location_id);
    if (!companyId) continue;
    const stats = statsByCompany.get(companyId) ?? { quote_count: 0, wins_count: 0, won_value: 0 };
    stats.quote_count += 1;
    if (winningOpportunityIds.has(q.id)) {
      stats.wins_count += 1;
      stats.won_value += q.amount ?? 0;
    }
    statsByCompany.set(companyId, stats);
  }

  return companies
    .map((c) => {
      const stats = statsByCompany.get(c.id) ?? { quote_count: 0, wins_count: 0, won_value: 0 };
      return { company_id: c.id, company_name: c.name, ...stats };
    })
    .filter((c) => c.quote_count > 0)
    .sort((a, b) => b.won_value - a.won_value || b.wins_count - a.wins_count || b.quote_count - a.quote_count);
}

// Which individual contact (distributor rep) is on the winning quote for each won
// project. Unlike getDistributorPerformance, this only looks at wins — a rep who's
// quoted a lot but never won anything won't show up here, by design (this is a
// leaderboard of who's actually closed, not a quote-volume count).
export async function getDistributorRepPerformance(): Promise<DistributorRepPerformance[]> {
  const supabase = await createClient();

  const { data: wonProjectRows, error: wonProjectsError } = await supabase
    .from("projects")
    .select("winning_opportunity_id")
    .eq("stage", "won")
    .not("winning_opportunity_id", "is", null);
  if (wonProjectsError) throw new Error(wonProjectsError.message);

  const winningOpportunityIds = ((wonProjectRows ?? []) as { winning_opportunity_id: string }[]).map(
    (p) => p.winning_opportunity_id
  );
  if (winningOpportunityIds.length === 0) return [];

  const { data: oppRows, error: oppsError } = await supabase
    .from("opportunities")
    .select("id, amount, contact_id, contacts(id, name), locations(companies(id, name))")
    .in("id", winningOpportunityIds);
  if (oppsError) throw new Error(oppsError.message);

  type ContactRef = { id: string; name: string };
  type Row = {
    id: string;
    amount: number | null;
    contact_id: string | null;
    contacts: ContactRef | ContactRef[] | null;
    locations: { companies: CompanyRef | CompanyRef[] | null } | { companies: CompanyRef | CompanyRef[] | null }[] | null;
  };

  const statsByContact = new Map<string, DistributorRepPerformance>();
  for (const row of (oppRows ?? []) as unknown as Row[]) {
    if (!row.contact_id) continue;
    const contact = Array.isArray(row.contacts) ? (row.contacts[0] ?? null) : row.contacts;
    if (!contact) continue;

    const loc = Array.isArray(row.locations) ? (row.locations[0] ?? null) : row.locations;
    const company = loc ? (Array.isArray(loc.companies) ? (loc.companies[0] ?? null) : loc.companies) : null;

    const existing = statsByContact.get(contact.id) ?? {
      contact_id: contact.id,
      contact_name: contact.name,
      company_name: company?.name ?? null,
      wins_count: 0,
      won_value: 0,
    };
    existing.wins_count += 1;
    existing.won_value += row.amount ?? 0;
    statsByContact.set(contact.id, existing);
  }

  return Array.from(statsByContact.values()).sort(
    (a, b) => b.won_value - a.won_value || b.wins_count - a.wins_count
  );
}
