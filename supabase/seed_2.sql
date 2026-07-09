-- Additive seed batch #2: run this after seed.sql (safe to run independently, doesn't
-- touch anything from the first batch). Adds S & J Supply Co. and White Cap Construction
-- Supply branches across the territory.
--
-- IMPORTANT: replace the email below with your actual login email before running this
-- in the Supabase SQL Editor.

do $$
declare
  v_rep_id uuid;
  v_sj_supply uuid;
  v_whitecap uuid;
begin
  select id into v_rep_id from auth.users where email = 'albertq31@gmail.com';
  if v_rep_id is null then
    raise exception 'No auth user found for that email — update the email in supabase/seed_2.sql';
  end if;

  insert into companies (rep_id, name, category, website)
  values (v_rep_id, 'S & J Supply Co., Inc.', 'distributor', 'https://s-jsupply.com')
  returning id into v_sj_supply;

  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, distributor_type, status) values
    (v_rep_id, v_sj_supply, 'S & J Supply Co. - Santa Fe Springs', '13105 Florence Ave', 'Santa Fe Springs', 'CA', '90670', 'socal', 'both', 'prospect');

  insert into companies (rep_id, name, category, website, notes)
  values (v_rep_id, 'White Cap Construction Supply', 'distributor', 'https://www.whitecap.com', 'Concrete accessories, tools, and building materials distributor — relevant for trench drain/concrete-adjacent products.')
  returning id into v_whitecap;

  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, status) values
    (v_rep_id, v_whitecap, 'White Cap - Bakersfield 069', '3027 Landco Drive', 'Bakersfield', 'CA', '93308', 'socal', 'prospect'),
    (v_rep_id, v_whitecap, 'White Cap - Los Angeles 029', '101 S Mission Road', 'Los Angeles', 'CA', '90033', 'socal', 'prospect'),
    (v_rep_id, v_whitecap, 'White Cap - Los Angeles 019', '5400 McConnell Avenue', 'Los Angeles', 'CA', '90066', 'socal', 'prospect'),
    (v_rep_id, v_whitecap, 'White Cap - Sun Valley 383', '8901 Bradley Ave', 'Sun Valley', 'CA', '91352', 'socal', 'prospect'),
    (v_rep_id, v_whitecap, 'White Cap - Anaheim 302', '3250 E. Carpenter Ave.', 'Anaheim', 'CA', '92806', 'socal', 'prospect'),
    (v_rep_id, v_whitecap, 'White Cap - Santa Ana 001', '1723 S Ritchey St', 'Santa Ana', 'CA', '92705', 'socal', 'prospect'),
    (v_rep_id, v_whitecap, 'White Cap - Ontario 028', '5055 East Airport Dr', 'Ontario', 'CA', '91761', 'socal', 'prospect'),
    (v_rep_id, v_whitecap, 'White Cap - Riverside 004', '4133 Fairgrounds St', 'Riverside', 'CA', '92501', 'socal', 'prospect'),
    (v_rep_id, v_whitecap, 'White Cap - San Bernardino 823 (Rental Yard)', '1359 W Rialto Ave', 'San Bernardino', 'CA', '92410', 'socal', 'prospect'),
    (v_rep_id, v_whitecap, 'White Cap - San Bernardino 820', '379 South I Street', 'San Bernardino', 'CA', '92410', 'socal', 'prospect'),
    (v_rep_id, v_whitecap, 'White Cap - Temecula 006', '28065 Diaz Road', 'Temecula', 'CA', '92590', 'socal', 'prospect'),
    (v_rep_id, v_whitecap, 'White Cap - San Diego 003', '7560 Convoy Court', 'San Diego', 'CA', '92111', 'socal', 'prospect'),
    (v_rep_id, v_whitecap, 'White Cap - National City 059', '2215 Cleveland Ave', 'National City', 'CA', '91950', 'socal', 'prospect'),
    (v_rep_id, v_whitecap, 'White Cap - Escondido 382', '505 Corporate Drive', 'Escondido', 'CA', '92029', 'socal', 'prospect'),
    (v_rep_id, v_whitecap, 'White Cap - San Marcos 830', '804-B Rancheros Drive', 'San Marcos', 'CA', '92069', 'socal', 'prospect'),
    (v_rep_id, v_whitecap, 'White Cap - Las Vegas 011', '3450 West Teco Ave', 'Las Vegas', 'NV', '89118', 'vegas', 'prospect'),
    (v_rep_id, v_whitecap, 'White Cap - North Las Vegas 038', '4171 Distribution Circle, Suite 107', 'North Las Vegas', 'NV', '89030', 'vegas', 'prospect');

end $$;
