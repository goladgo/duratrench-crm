-- Weekly planner: manual day-by-day list of stops a rep intends to make.
-- Blank each week — reps add stops for the days ahead as they plan their route.

create type planned_visit_status as enum ('planned', 'completed', 'skipped');

create table planned_visits (
  id uuid primary key default gen_random_uuid(),
  rep_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  planned_date date not null,
  status planned_visit_status not null default 'planned',
  notes text,
  created_at timestamptz not null default now()
);

create index planned_visits_rep_date_idx on planned_visits (rep_id, planned_date);
create index planned_visits_location_id_idx on planned_visits (location_id);

alter table planned_visits enable row level security;

create policy "reps manage own planned visits" on planned_visits
  for all using (rep_id = auth.uid()) with check (rep_id = auth.uid());
