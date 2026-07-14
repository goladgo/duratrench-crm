-- Northern CA distributor import for Dave Land (DLand@eric-sons.com). Source: Dave's
-- shared "Distributors" Google Maps list (69 saved places). This is a partial import —
-- 15 branches whose name + address were individually verified against the live Google
-- Maps listing. The remaining ~54 were left out rather than risk importing a mismatched
-- name/address pair; Dave can add those himself through the app (Add Location, or the
-- business-card scanner) as he builds out his territory.
--
-- Prerequisite: Dave must have already created his account (sign up with this email on
-- the app's login page) before this script is run, or the lookup below will fail.

do $$
declare
  v_rep_id uuid;
  v_urww uuid;
  v_slakey uuid;
  v_pace uuid;
  v_ferguson uuid;
begin
  select id into v_rep_id from auth.users where lower(email) = lower('DLand@eric-sons.com');
  if v_rep_id is null then
    raise exception 'No auth user found for DLand@eric-sons.com — make sure he has created his account first.';
  end if;

  ------------------------------------------------------------------
  -- Companies
  ------------------------------------------------------------------
  insert into companies (rep_id, name, category) values (v_rep_id, 'Underground Republic Water Works', 'distributor') returning id into v_urww;
  insert into companies (rep_id, name, category) values (v_rep_id, 'Slakey Brothers', 'distributor') returning id into v_slakey;
  insert into companies (rep_id, name, category) values (v_rep_id, 'PACE Supply', 'distributor') returning id into v_pace;
  insert into companies (rep_id, name, category) values (v_rep_id, 'Ferguson', 'distributor') returning id into v_ferguson;

  ------------------------------------------------------------------
  -- Underground Republic Water Works
  ------------------------------------------------------------------
  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, status) values
    (v_rep_id, v_urww, 'Underground Republic Water Works - San Jose', '1175 Campbell Ave', 'San Jose', 'CA', '95126', 'norcal', 'prospect');

  ------------------------------------------------------------------
  -- Slakey Brothers
  ------------------------------------------------------------------
  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, status) values
    (v_rep_id, v_slakey, 'Slakey Brothers - Hayward', '3395 Arden Rd', 'Hayward', 'CA', '94545', 'norcal', 'prospect'),
    (v_rep_id, v_slakey, 'Slakey Brothers - Fairfield', '1190 Western St', 'Fairfield', 'CA', '94533', 'norcal', 'prospect'),
    (v_rep_id, v_slakey, 'Slakey Brothers - San Jose', '1480 Nicora Ave', 'San Jose', 'CA', '95133', 'norcal', 'prospect'),
    (v_rep_id, v_slakey, 'Slakey Brothers - Santa Rosa', '2845 Duke Ct', 'Santa Rosa', 'CA', '95407', 'norcal', 'prospect'),
    (v_rep_id, v_slakey, 'Slakey Brothers - Sand City', '321 Orange Ave', 'Sand City', 'CA', '93955', 'norcal', 'prospect'),
    (v_rep_id, v_slakey, 'Slakey Brothers - Jackson', '1400 CA-49', 'Jackson', 'CA', '95642', 'norcal', 'prospect');

  ------------------------------------------------------------------
  -- PACE Supply
  ------------------------------------------------------------------
  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, status) values
    (v_rep_id, v_pace, 'PACE Supply - Santa Clara', '605 Laurelwood Rd', 'Santa Clara', 'CA', '95054', 'norcal', 'prospect'),
    (v_rep_id, v_pace, 'PACE Supply - Dublin', '6400 Sierra Ct Suite G', 'Dublin', 'CA', '94568', 'norcal', 'prospect'),
    (v_rep_id, v_pace, 'PACE Supply - Sacramento', '8400 24th Ave', 'Sacramento', 'CA', '95826', 'norcal', 'prospect'),
    (v_rep_id, v_pace, 'PACE Supply - San Rafael', '1151 Andersen Dr', 'San Rafael', 'CA', '94901', 'norcal', 'prospect'),
    (v_rep_id, v_pace, 'PACE Supply - San Jose', '630 Quinn Ave', 'San Jose', 'CA', '95112', 'norcal', 'prospect');

  ------------------------------------------------------------------
  -- Ferguson (plumbing + waterworks divisions)
  ------------------------------------------------------------------
  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, distributor_type, status) values
    (v_rep_id, v_ferguson, 'Ferguson Plumbing Supply - Sacramento', '5631 Auburn Blvd', 'Sacramento', 'CA', '95841', 'norcal', 'plumbing', 'prospect'),
    (v_rep_id, v_ferguson, 'Ferguson Plumbing Supply - Petaluma', '984 Transport Way', 'Petaluma', 'CA', '94954', 'norcal', 'plumbing', 'prospect'),
    (v_rep_id, v_ferguson, 'Ferguson Waterworks - Bakersfield', '6300 District Blvd', 'Bakersfield', 'CA', '93313', 'norcal', 'waterworks', 'prospect');
end $$;
