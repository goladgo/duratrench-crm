-- Adds an explicit ordering column to planned_visits so a rep can drag-and-drop
-- reorder their stops within a day (or move a stop to a different day) on the
-- weekly planner. Previously the list order was implicit (created_at), which
-- meant there was nothing to persist a manual reorder against.

alter table planned_visits add column position integer not null default 0;

-- Backfill existing rows: number each rep's stops within a day in their current
-- (created_at) order, starting at 0, so today's on-screen order doesn't change
-- the moment this column starts being read.
with ordered as (
  select
    id,
    row_number() over (partition by rep_id, planned_date order by created_at) - 1 as rn
  from planned_visits
)
update planned_visits pv
set position = ordered.rn
from ordered
where pv.id = ordered.id;
