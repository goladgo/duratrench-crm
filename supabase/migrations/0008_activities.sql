-- Generalizes visit_notes into an activity log: a rep can log a visit, call, or
-- email against a location. Kept the existing table/policy (rather than a disruptive
-- rename) and just added the type + an optional link to a specific quote, so a
-- call/email can be logged as a direct follow-up on a quote ("followed up on the
-- Lodi quote") and surfaced on that quote/project later.

create type activity_type as enum ('visit', 'call', 'email');

alter table visit_notes add column activity_type activity_type not null default 'visit';
alter table visit_notes add column opportunity_id uuid references opportunities(id) on delete set null;

create index visit_notes_opportunity_id_idx on visit_notes (opportunity_id);
