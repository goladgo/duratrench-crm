-- Reports: cross-rep "Design Firm Activity" report for the product engineering team.
-- Engineering keeps its own separate contacts spreadsheet (no CRM access) -- instead of
-- giving them CRM logins, a rep presses "Generate Report" on /reports and gets an .xlsx
-- of everything new since the last time *anyone* generated this report: new design firms,
-- new contacts, and new visit/call/email activity, across every rep's territory (Albert
-- and Dave both work design firms; the engineer needs to see both, not just whoever is
-- logged in). That cross-rep visibility is the one place a rep needs to see another rep's
-- rows, which normal RLS (rep_id = auth.uid()) intentionally blocks -- so the aggregation
-- lives in SECURITY DEFINER functions rather than being queried directly from the client.

create table design_firm_report_runs (
  id uuid primary key default gen_random_uuid(),
  generated_by uuid not null references auth.users(id),
  generated_by_email text not null,
  generated_at timestamptz not null default now()
);

alter table design_firm_report_runs enable row level security;

-- Any authenticated rep can see run history (so the Reports page can show "last
-- generated ..." regardless of who ran it) and insert a run row as themselves.
create policy "authenticated can read report runs" on design_firm_report_runs
  for select using (auth.role() = 'authenticated');

create policy "authenticated can insert own report runs" on design_firm_report_runs
  for insert with check (generated_by = auth.uid());

-- New design-firm companies (civil engineering + landscape architecture) created since
-- `since`, across all reps.
create or replace function get_new_design_firms(since timestamptz)
returns table (
  company_id uuid,
  company_name text,
  category company_category,
  rep_email text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select c.id, c.name, c.category, u.email, c.created_at
  from companies c
  join auth.users u on u.id = c.rep_id
  where c.category in ('civil_engineering', 'landscape_architecture')
    and c.created_at > since
  order by c.created_at;
$$;

-- New contacts added at design-firm locations since `since`, across all reps.
create or replace function get_new_design_firm_contacts(since timestamptz)
returns table (
  contact_id uuid,
  contact_name text,
  title text,
  phone text,
  email text,
  company_name text,
  location_name text,
  city text,
  state text,
  rep_email text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select ct.id, ct.name, ct.title, ct.phone, ct.email,
         c.name, l.name, l.city, l.state, u.email, ct.created_at
  from contacts ct
  join locations l on l.id = ct.location_id
  join companies c on c.id = l.company_id
  join auth.users u on u.id = ct.rep_id
  where c.category in ('civil_engineering', 'landscape_architecture')
    and ct.created_at > since
  order by ct.created_at;
$$;

-- New activity (visit/call/email) logged at design-firm locations since `since`, across
-- all reps.
create or replace function get_new_design_firm_activity(since timestamptz)
returns table (
  activity_id uuid,
  activity_type activity_type,
  activity_date date,
  notes text,
  company_name text,
  location_name text,
  city text,
  state text,
  contact_name text,
  rep_email text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select vn.id, vn.activity_type, vn.visit_date, vn.notes,
         c.name, l.name, l.city, l.state, ct.name, u.email, vn.created_at
  from visit_notes vn
  join locations l on l.id = vn.location_id
  join companies c on c.id = l.company_id
  left join contacts ct on ct.id = vn.contact_id
  join auth.users u on u.id = vn.rep_id
  where c.category in ('civil_engineering', 'landscape_architecture')
    and vn.created_at > since
  order by vn.created_at;
$$;

revoke all on function get_new_design_firms(timestamptz) from public;
revoke all on function get_new_design_firm_contacts(timestamptz) from public;
revoke all on function get_new_design_firm_activity(timestamptz) from public;
grant execute on function get_new_design_firms(timestamptz) to authenticated;
grant execute on function get_new_design_firm_contacts(timestamptz) to authenticated;
grant execute on function get_new_design_firm_activity(timestamptz) to authenticated;
