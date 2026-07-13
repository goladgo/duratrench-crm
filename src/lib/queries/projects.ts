import { createClient } from "@/lib/supabase/server";
import type { Company, Project, ProjectDetail, ProjectListItem, ProjectQuote } from "@/lib/types";

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
