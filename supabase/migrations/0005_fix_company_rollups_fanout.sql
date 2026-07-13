-- Fixes a fan-out bug in company_rollups: joining contacts, opportunities, and
-- visit_notes all at the same level multiplied sum(o.amount) by the number of
-- contacts (and visit notes) under a location, wildly inflating open_value/won_value
-- for any company with more than one contact per branch. Correlated subqueries
-- aggregate each relation independently against the same location set, so nothing
-- gets double-counted.

create or replace view company_rollups
with (security_invoker = true) as
select
  c.id as company_id,
  c.rep_id,
  (select count(*) from locations l where l.company_id = c.id) as location_count,
  (select count(*) from locations l where l.company_id = c.id and l.status = 'active') as active_location_count,
  (select count(*) from contacts ct join locations l on l.id = ct.location_id where l.company_id = c.id) as contact_count,
  coalesce(
    (select sum(o.amount) from opportunities o join locations l on l.id = o.location_id
     where l.company_id = c.id and o.stage in ('quoted', 'negotiating')),
    0
  ) as open_value,
  coalesce(
    (select sum(o.amount) from opportunities o join locations l on l.id = o.location_id
     where l.company_id = c.id and o.stage = 'won'),
    0
  ) as won_value,
  (select max(vn.visit_date) from visit_notes vn join locations l on l.id = vn.location_id where l.company_id = c.id) as last_visit_date
from companies c;
