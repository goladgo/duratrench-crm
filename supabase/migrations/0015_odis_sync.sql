-- ODIS sync: mirror the fields ODIS owns onto each CRM project so the two systems can be
-- reconciled by pasting the ODIS Project Search table into the CRM.
-- ODIS stays the system of record for price/status/follow-up; the CRM keeps only a copy
-- plus the link (odis_id). Follows 0014_cross_rep_design_firm_visibility.

alter table projects
  add column if not exists odis_id text,
  add column if not exists odis_status text,
  add column if not exists odis_bidder text,
  add column if not exists odis_price numeric(14, 2),
  add column if not exists odis_follow_up_date date,
  add column if not exists odis_last_modified date,
  add column if not exists odis_synced_at timestamptz;

-- One CRM project per ODIS project per rep.
create unique index if not exists projects_rep_odis_id_key
  on projects (rep_id, odis_id)
  where odis_id is not null;
