-- Projects: a real-world job that multiple distributor branches can independently
-- quote on, and that a design firm can be credited with spec'ing. Quotes
-- (opportunities.kind = 'quote') optionally link to a project via project_id.
-- Design firm specs (kind = 'spec') are unaffected by this — the specifying firm is
-- tracked directly on the project instead, since it's the firm as a whole (not a
-- given office) that's credited with the spec.

create type project_stage as enum ('quoted', 'won', 'lost');

create table projects (
  id uuid primary key default gen_random_uuid(),
  rep_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  notes text,
  stage project_stage not null default 'quoted',
  specifying_company_id uuid references companies(id) on delete set null,
  winning_opportunity_id uuid references opportunities(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table opportunities add column project_id uuid references projects(id) on delete set null;

create index projects_rep_id_idx on projects (rep_id);
create index projects_specifying_company_id_idx on projects (specifying_company_id);
create index opportunities_project_id_idx on opportunities (project_id);

alter table projects enable row level security;

create policy "reps manage own projects" on projects
  for all using (rep_id = auth.uid()) with check (rep_id = auth.uid());
