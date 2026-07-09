-- Territory CRM initial schema
-- Entities: companies (parent orgs) -> locations (branches/offices) -> contacts
-- plus visit_notes and opportunities (quotes for distributors, specs for design firms)

create extension if not exists "pgcrypto";

create type company_category as enum ('distributor', 'civil_engineering', 'landscape_architecture');
create type distributor_type as enum ('waterworks', 'plumbing', 'both');
create type territory_region as enum ('socal', 'vegas');
create type location_status as enum ('prospect', 'active', 'inactive');
create type opportunity_kind as enum ('quote', 'spec');
create type opportunity_stage as enum ('quoted', 'negotiating', 'won', 'lost');

-- Parent company, e.g. "Ferguson Waterworks", "Core & Main", or an independent distributor/firm
create table companies (
  id uuid primary key default gen_random_uuid(),
  rep_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  category company_category not null,
  website text,
  notes text,
  created_at timestamptz not null default now()
);

-- A specific branch/office that gets visited
create table locations (
  id uuid primary key default gen_random_uuid(),
  rep_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  company_id uuid references companies(id) on delete set null,
  name text not null,
  address text,
  city text,
  state text,
  zip text,
  lat double precision,
  lng double precision,
  distributor_type distributor_type,
  territory_region territory_region not null,
  status location_status not null default 'prospect',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table contacts (
  id uuid primary key default gen_random_uuid(),
  rep_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  name text not null,
  title text,
  phone text,
  email text,
  is_primary boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

create table visit_notes (
  id uuid primary key default gen_random_uuid(),
  rep_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  contact_id uuid references contacts(id) on delete set null,
  visit_date date not null default current_date,
  notes text not null,
  follow_up_date date,
  created_at timestamptz not null default now()
);

-- "quote" for distributor deals, "spec" for engineering/landscape firm project specs
create table opportunities (
  id uuid primary key default gen_random_uuid(),
  rep_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  contact_id uuid references contacts(id) on delete set null,
  kind opportunity_kind not null default 'quote',
  title text not null,
  product_line text,
  amount numeric(12, 2),
  stage opportunity_stage not null default 'quoted',
  quote_date date not null default current_date,
  close_date date,
  notes text,
  created_at timestamptz not null default now()
);

create index locations_company_id_idx on locations (company_id);
create index locations_territory_status_idx on locations (territory_region, status);
create index contacts_location_id_idx on contacts (location_id);
create index visit_notes_location_id_idx on visit_notes (location_id);
create index opportunities_location_id_idx on opportunities (location_id);

-- Rollup of every location under a parent company, for the "who's performing best" view.
-- security_invoker means it runs with the querying user's RLS, not the view owner's.
create view company_rollups
with (security_invoker = true) as
select
  c.id as company_id,
  c.rep_id,
  count(distinct l.id) as location_count,
  count(distinct l.id) filter (where l.status = 'active') as active_location_count,
  count(distinct ct.id) as contact_count,
  coalesce(sum(o.amount) filter (where o.stage in ('quoted', 'negotiating')), 0) as open_value,
  coalesce(sum(o.amount) filter (where o.stage = 'won'), 0) as won_value,
  max(vn.visit_date) as last_visit_date
from companies c
left join locations l on l.company_id = c.id
left join contacts ct on ct.location_id = l.id
left join opportunities o on o.location_id = l.id
left join visit_notes vn on vn.location_id = l.id
group by c.id, c.rep_id;

-- Row Level Security: every row is scoped to the rep who owns it.
-- Single-user today, but this makes adding teammates later a policy change, not a rewrite.
alter table companies enable row level security;
alter table locations enable row level security;
alter table contacts enable row level security;
alter table visit_notes enable row level security;
alter table opportunities enable row level security;

create policy "reps manage own companies" on companies
  for all using (rep_id = auth.uid()) with check (rep_id = auth.uid());

create policy "reps manage own locations" on locations
  for all using (rep_id = auth.uid()) with check (rep_id = auth.uid());

create policy "reps manage own contacts" on contacts
  for all using (rep_id = auth.uid()) with check (rep_id = auth.uid());

create policy "reps manage own visit notes" on visit_notes
  for all using (rep_id = auth.uid()) with check (rep_id = auth.uid());

create policy "reps manage own opportunities" on opportunities
  for all using (rep_id = auth.uid()) with check (rep_id = auth.uid());
