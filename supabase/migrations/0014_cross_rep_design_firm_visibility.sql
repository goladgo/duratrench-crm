-- Cross-rep visibility for design firms (civil engineering + landscape architecture
-- only -- distributor/contractor data stays strictly rep-exclusive, since that's
-- competitive territory data, not something reps benefit from comparing notes on).
--
-- Rationale (explicit user request): "I think there is a benefit to seeing all of the
-- locations for other reps. It may help them get in with a firm they're working on if
-- they see we already did a lunch and learn at one or have contacts." Each rep's copy of
-- a design firm is a separate `companies` row (RLS is rep_id = auth.uid(), so e.g.
-- Albert's "Kimley-Horn" and Dave's "Kimley-Horn" are unrelated rows with no shared key)
-- -- these two read-only SECURITY DEFINER functions let the UI show what OTHER reps have
-- on file for a same-named firm, without loosening RLS itself. Both are strictly
-- read-only (no insert/update/delete path), scoped to the two design-firm categories,
-- and only reachable by an authenticated rep -- matching them by company name
-- (case-insensitive, trimmed) is a deliberate simplification since there's no shared
-- identity column linking one rep's company row to another's for the same real firm.
--
-- Company-level rollup across every rep, for the /firms list page's "show all reps"
-- toggle -- deliberately NOT merged into one row per firm name (that would require
-- fuzzy-matching logic and blur which rep actually owns which office); each rep's copy
-- of a firm shows as its own card, labeled by rep.
create or replace function get_all_design_firms_across_reps()
returns table (
  company_id uuid,
  company_name text,
  category company_category,
  rep_id uuid,
  rep_email text,
  location_count bigint,
  contact_count bigint,
  last_visit_date date,
  lunch_learn_completed_at date
)
language sql
security definer
set search_path = public
as $$
  select
    c.id,
    c.name,
    c.category,
    c.rep_id,
    u.email,
    count(distinct l.id),
    count(distinct ct.id),
    max(vn.visit_date),
    max(l.lunch_learn_completed_at)
  from companies c
  join auth.users u on u.id = c.rep_id
  left join locations l on l.company_id = c.id
  left join contacts ct on ct.location_id = l.id
  left join visit_notes vn on vn.location_id = l.id
  where c.category in ('civil_engineering', 'landscape_architecture')
  group by c.id, c.name, c.category, c.rep_id, u.email
  order by c.name, u.email;
$$;

-- Location-level detail for a specific firm name, across every rep, for the company
-- profile page's "other reps' offices" section -- includes each office's contacts (as a
-- json array, to avoid N+1 round trips) and last-visit/Lunch & Learn signals, since
-- that's specifically the info the user wants surfaced ("if they see we already have
-- contacts... or did a lunch and learn").
create or replace function get_design_firm_locations_by_name(p_company_name text)
returns table (
  location_id uuid,
  location_name text,
  address text,
  city text,
  state text,
  status location_status,
  lunch_learn_scheduled_at date,
  lunch_learn_completed_at date,
  rep_id uuid,
  rep_email text,
  last_visit_date date,
  contacts jsonb
)
language sql
security definer
set search_path = public
as $$
  select
    l.id,
    l.name,
    l.address,
    l.city,
    l.state,
    l.status,
    l.lunch_learn_scheduled_at,
    l.lunch_learn_completed_at,
    l.rep_id,
    u.email,
    (select max(vn.visit_date) from visit_notes vn where vn.location_id = l.id),
    coalesce(
      (
        select jsonb_agg(jsonb_build_object('name', ct.name, 'title', ct.title, 'phone', ct.phone, 'email', ct.email))
        from contacts ct
        where ct.location_id = l.id
      ),
      '[]'::jsonb
    )
  from locations l
  join companies c on c.id = l.company_id
  join auth.users u on u.id = l.rep_id
  where c.category in ('civil_engineering', 'landscape_architecture')
    and lower(trim(c.name)) = lower(trim(p_company_name))
  order by u.email, l.name;
$$;

-- Supabase grants execute on new functions to `anon` by default regardless of a plain
-- `revoke ... from public` -- learned the hard way in the session-5 report functions, so
-- revoking from anon explicitly this time rather than waiting for get_advisors to flag it.
revoke all on function get_all_design_firms_across_reps() from public;
revoke execute on function get_all_design_firms_across_reps() from anon;
grant execute on function get_all_design_firms_across_reps() to authenticated;

revoke all on function get_design_firm_locations_by_name(text) from public;
revoke execute on function get_design_firm_locations_by_name(text) from anon;
grant execute on function get_design_firm_locations_by_name(text) to authenticated;
