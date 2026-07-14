-- Distributors no longer have a "prospect" state in the app — every distributor
-- branch can already sell the product, so the UI now only offers Active/Inactive
-- for them. Backfill existing distributor locations that were seeded/created as
-- 'prospect' (mostly Dave's Northern CA imports) so the data matches. Design firms
-- and contractors are untouched — they still go through Prospect -> Active (on
-- Lunch & Learn completion) -> possibly Inactive.

update locations l
set status = 'active'
from companies c
where l.company_id = c.id
  and c.category = 'distributor'
  and l.status = 'prospect';
