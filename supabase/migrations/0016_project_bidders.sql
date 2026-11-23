-- Bidders: who is bidding each project, taken from the ODIS "Bidders" window.
-- Deliberately separate from `opportunities` (quotes): a bidder is just "this person is bidding the
-- job", so listing 9 bidders doesn't inflate quote counts / distributor performance, and declaring a
-- winner (which deletes the losing *quotes*) never wipes the bidder list. A bidder becomes a quote
-- only when you quote them or when they win.
-- The branch is implied by the contact (contacts.location_id), so only project + contact are stored.

create table if not exists project_bidders (
  id uuid primary key default gen_random_uuid(),
  rep_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (project_id, contact_id)
);

create index if not exists project_bidders_project_id_idx on project_bidders (project_id);
create index if not exists project_bidders_contact_id_idx on project_bidders (contact_id);

alter table project_bidders enable row level security;

create policy "reps manage own project bidders" on project_bidders
  for all using (rep_id = auth.uid()) with check (rep_id = auth.uid());
