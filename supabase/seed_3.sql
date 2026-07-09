-- Additive seed batch #3: corrects/expands distributor coverage.
--   1. Adds the missing Ferguson Waterworks branch in Redondo Beach (existing company).
--   2. Adds Ferguson Plumbing Supply as a SEPARATE company from Ferguson Waterworks,
--      with its own branch network.
--   3. Adds Reece Plumbing as a separate company from the existing Fortiline Waterworks
--      entry (both are Reece Group brands, but serve different customers).
--   4. Adds Hajoca plumbing supply branches (Hajoca operates under many local trade
--      names — each location's "name" reflects the local branding).
--   5. Splits the old combined "WinWater / Winsupply Local Companies" company into
--      WinWater (civil/municipal) and Winsupply (plumbing), and adds more branches
--      of each.
--   6. Adds Five Star Plumbing & Fire Supplies (a real wholesale distributor, LA-area
--      only — everything under similar names elsewhere in the territory turned out to
--      be an unrelated residential service/repair company, so it's not included).
--
-- IMPORTANT: replace the email below with your actual login email before running this
-- in the Supabase SQL Editor (or via scripts/run-sql.mjs).

do $$
declare
  v_rep_id uuid;
  v_ferguson_ww uuid;
  v_ferguson_plumbing uuid;
  v_reece_plumbing uuid;
  v_hajoca uuid;
  v_winwater uuid;
  v_winsupply uuid;
  v_five_star uuid;
begin
  select id into v_rep_id from auth.users where email = 'REPLACE_WITH_YOUR_EMAIL';
  if v_rep_id is null then
    raise exception 'No auth user found for that email — update the email in supabase/seed_3.sql';
  end if;

  ------------------------------------------------------------------
  -- 1. Missing Ferguson Waterworks branch (existing company)
  ------------------------------------------------------------------

  select id into v_ferguson_ww from companies where rep_id = v_rep_id and name = 'Ferguson Waterworks';
  if v_ferguson_ww is null then
    raise exception 'Ferguson Waterworks company not found — run seed.sql first.';
  end if;

  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, distributor_type, status) values
    (v_rep_id, v_ferguson_ww, 'Ferguson Waterworks #2916', '2600 Marine Ave', 'Redondo Beach', 'CA', '90278', 'socal', 'waterworks', 'prospect');

  ------------------------------------------------------------------
  -- 2. Ferguson Plumbing Supply (separate company from Ferguson Waterworks)
  ------------------------------------------------------------------

  insert into companies (rep_id, name, category, website, notes)
  values (v_rep_id, 'Ferguson Plumbing Supply', 'distributor', 'https://www.ferguson.com', 'Ferguson''s residential/commercial plumbing (PVF) division — separate branch network from Ferguson Waterworks, though sometimes co-located.')
  returning id into v_ferguson_plumbing;

  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, distributor_type, status) values
    (v_rep_id, v_ferguson_plumbing, 'Ferguson Plumbing Supply #1014', '6300 District Blvd', 'Bakersfield', 'CA', '93313', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_ferguson_plumbing, 'Ferguson Plumbing Supply #2800', '1845 Edison Hwy', 'Bakersfield', 'CA', '93305', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_ferguson_plumbing, 'Ferguson Plumbing Supply #1137', '141 W 23rd St', 'Los Angeles', 'CA', '90007', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_ferguson_plumbing, 'Ferguson Plumbing Supply #2028', '4558 Brazil St', 'Los Angeles', 'CA', '90039', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_ferguson_plumbing, 'Ferguson Plumbing Supply #1455', '1161 E Artesia Blvd', 'Carson', 'CA', '90746', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_ferguson_plumbing, 'Ferguson Plumbing Supply #1112', '2600 Marine Ave', 'Redondo Beach', 'CA', '90278', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_ferguson_plumbing, 'Ferguson Plumbing Supply #1461', '1651 S Ritchey St', 'Santa Ana', 'CA', '92705', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_ferguson_plumbing, 'Ferguson Plumbing Supply #0571', '710 E Ball Rd', 'Anaheim', 'CA', '92805', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_ferguson_plumbing, 'Ferguson Plumbing Supply #1951', '4652 E Brickell St', 'Ontario', 'CA', '91761', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_ferguson_plumbing, 'Ferguson Plumbing Supply #3361', '1600 7th St', 'Riverside', 'CA', '92507', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_ferguson_plumbing, 'Ferguson Plumbing Supply #0570', '2751 Durahart St', 'Riverside', 'CA', '92507', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_ferguson_plumbing, 'Ferguson Plumbing Supply #1071', '1090 E Cooley Ave', 'San Bernardino', 'CA', '92408', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_ferguson_plumbing, 'Ferguson Plumbing Supply #0636', '71 E Grand Blvd', 'Corona', 'CA', '92879', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_ferguson_plumbing, 'Ferguson Plumbing Supply #0633', '43244 Rancho Way', 'Temecula', 'CA', '92590', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_ferguson_plumbing, 'Ferguson Plumbing Supply #0674', '4699 Mercury St', 'San Diego', 'CA', '92111', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_ferguson_plumbing, 'Ferguson Plumbing Supply #0667', '3280 Market St', 'San Diego', 'CA', '92102', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_ferguson_plumbing, 'Ferguson Plumbing Supply #3622', '4533 Mission Gorge Pl', 'San Diego', 'CA', '92120', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_ferguson_plumbing, 'Ferguson Plumbing Supply #0673', '859 Rock Springs Rd', 'Escondido', 'CA', '92025', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_ferguson_plumbing, 'Ferguson Plumbing Supply #1041', '1149 N Marshall Ave', 'El Cajon', 'CA', '92020', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_ferguson_plumbing, 'Ferguson Plumbing Supply #0675', '3033 S Valley View Blvd', 'Las Vegas', 'NV', '89102', 'vegas', 'plumbing', 'prospect'),
    (v_rep_id, v_ferguson_plumbing, 'Ferguson Plumbing Supply #1391', '4454 N Rancho Dr, Suites 1-4', 'Las Vegas', 'NV', '89130', 'vegas', 'plumbing', 'prospect'),
    (v_rep_id, v_ferguson_plumbing, 'Ferguson Plumbing Supply #0659', '501 Parkson Rd', 'Henderson', 'NV', '89011', 'vegas', 'plumbing', 'prospect');

  ------------------------------------------------------------------
  -- 3. Reece Plumbing (separate company from Fortiline Waterworks)
  ------------------------------------------------------------------

  insert into companies (rep_id, name, category, website, notes)
  values (v_rep_id, 'Reece Plumbing', 'distributor', 'https://www.reece.com', 'Reece Group''s residential/commercial plumbing supply & showroom brand (several ex-Todd Pipe, Express Pipe, Farnsworth, and Morsco locations now rebranded) — separate customer-facing channel from Fortiline Waterworks, though both are owned by Reece Group.')
  returning id into v_reece_plumbing;

  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, distributor_type, status) values
    (v_rep_id, v_reece_plumbing, 'Reece Plumbing - Long Beach', '3430 E Airport Way', 'Long Beach', 'CA', '90806', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_reece_plumbing, 'Reece Plumbing - Los Angeles (Purdue Ave)', '2311 Purdue Ave', 'Los Angeles', 'CA', '90064', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_reece_plumbing, 'Reece Plumbing - Los Angeles (Willimet St)', '4175 Willimet St', 'Los Angeles', 'CA', '90039', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_reece_plumbing, 'Reece Plumbing - Van Nuys', '13805 Saticoy St', 'Van Nuys', 'CA', '91402', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_reece_plumbing, 'Reece Plumbing - Culver City', '11244 Playa Ct', 'Culver City', 'CA', '90230', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_reece_plumbing, 'Reece Plumbing - Torrance', '4310 W 190th St', 'Torrance', 'CA', '90504', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_reece_plumbing, 'Reece Bath+Kitchen - Studio City', '12319 Ventura Blvd', 'Studio City', 'CA', '91604', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_reece_plumbing, 'Reece Plumbing - Anaheim (State College Blvd)', '1711 S State College Blvd', 'Anaheim', 'CA', '92805', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_reece_plumbing, 'Reece Plumbing - Anaheim (Edward Ct)', '1005 N Edward Ct', 'Anaheim', 'CA', '92806', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_reece_plumbing, 'Reece Plumbing - Irvine', '299 Goddard St', 'Irvine', 'CA', '92618', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_reece_plumbing, 'Reece Plumbing - Garden Grove', '13591 Harbor Blvd', 'Garden Grove', 'CA', '92843', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_reece_plumbing, 'Reece Plumbing - Huntington Beach', '17812 Jamestown Ln', 'Huntington Beach', 'CA', '92647', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_reece_plumbing, 'Reece Plumbing - Costa Mesa', '824 W 18th St, Ste B', 'Costa Mesa', 'CA', '92627', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_reece_plumbing, 'Reece Plumbing - Corona', '1525 Consumer Cir', 'Corona', 'CA', '92878', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_reece_plumbing, 'Reece Plumbing - Fontana', '10509 Business Dr, Ste B', 'Fontana', 'CA', '92337', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_reece_plumbing, 'Reece Plumbing - Riverside', '1886 Spruce St', 'Riverside', 'CA', '92507', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_reece_plumbing, 'Reece Plumbing - San Diego', '1004 Cudahy Pl', 'San Diego', 'CA', '92110', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_reece_plumbing, 'Reece Plumbing - Oceanside', '4087 Calle Platino', 'Oceanside', 'CA', '92056', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_reece_plumbing, 'Reece Plumbing - Santee', '9489 Mission Park Pl', 'Santee', 'CA', '92071', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_reece_plumbing, 'Reece Plumbing - Las Vegas', '3209 Meade Ave', 'Las Vegas', 'NV', '89102', 'vegas', 'plumbing', 'prospect'),
    (v_rep_id, v_reece_plumbing, 'Reece Plumbing - North Las Vegas', '3650 W Cheyenne Ave', 'North Las Vegas', 'NV', '89032', 'vegas', 'plumbing', 'prospect');

  ------------------------------------------------------------------
  -- 4. Hajoca (operates under many local trade names)
  ------------------------------------------------------------------

  insert into companies (rep_id, name, category, website, notes)
  values (v_rep_id, 'Hajoca', 'distributor', 'https://www.hajoca.com', 'Hajoca operates locally under many different trade names; each location below is named per its local branding.')
  returning id into v_hajoca;

  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, distributor_type, status) values
    (v_rep_id, v_hajoca, 'Hajoca - Jefferson Blvd', '5221 W Jefferson Blvd', 'Los Angeles', 'CA', '90016', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_hajoca, 'Hajoca - Huntington Park', '2000 E Florence Ave', 'Huntington Park', 'CA', '90001', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_hajoca, 'Hajoca Los Angeles Plumbing Supply - Compton', '1220 W Walnut St', 'Compton', 'CA', '90220', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_hajoca, 'Hajoca - Van Nuys', '14650 Calvert St, Unit A', 'Van Nuys', 'CA', '91411', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_hajoca, 'Hajoca - Signal Hill', '2953 Obispo Ave', 'Signal Hill', 'CA', '90755', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_hajoca, 'Kohler Signature Store by Hajoca - Torrance', '22733 Hawthorne Blvd', 'Torrance', 'CA', '90505', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_hajoca, 'Hajoca - Irvine', '11 Goodyear, Suite A', 'Irvine', 'CA', '92618', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_hajoca, 'Hajoca - Costa Mesa', '3170 Airway Ave', 'Costa Mesa', 'CA', '92626', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_hajoca, 'Hajoca - Corona', '13455 Estelle St', 'Corona', 'CA', '92879', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_hajoca, 'Hajoca - Grand Terrace', '22070 Commerce Way', 'Grand Terrace', 'CA', '92313', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_hajoca, 'Keenan Supply, a Hajoca Company - San Diego', '7440 Convoy Ct, Suite B', 'San Diego', 'CA', '92111', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_hajoca, 'Kohler Signature Store by Hajoca - Solana Beach', '143 S Cedros Ave, Suite F&G', 'Solana Beach', 'CA', '92075', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_hajoca, 'Kelly''s Pipe & Supply Co., a Hajoca Company', '2124 S Industrial Rd', 'Las Vegas', 'NV', '89102', 'vegas', 'plumbing', 'prospect'),
    (v_rep_id, v_hajoca, 'Hajoca Corporation #547', '6770 Bermuda Rd', 'Las Vegas', 'NV', '89119', 'vegas', 'plumbing', 'prospect');

  ------------------------------------------------------------------
  -- 5. Split the old combined "WinWater / Winsupply" company into two:
  --    WinWater (civil/municipal side — Winwater Works Co. / Windustrial Co.
  --    branches) and Winsupply (plumbing side — Winnelson Co. / generic
  --    "Winsupply of X" branches). Renames + moves the existing company/
  --    location instead of re-inserting, since seed.sql already created it.
  ------------------------------------------------------------------

  select id into v_winwater from companies where rep_id = v_rep_id and name = 'WinWater / Winsupply Local Companies';
  if v_winwater is null then
    -- Already split by a previous run of this script.
    select id into v_winwater from companies where rep_id = v_rep_id and name = 'WinWater';
  end if;
  if v_winwater is null then
    raise exception 'WinWater company not found — run seed.sql first.';
  end if;

  update companies
  set name = 'WinWater',
      notes = 'Reece''s municipal/civil waterworks brand family (Winwater Works Co. / Windustrial Co. branches) — separate from the residential/commercial Winsupply plumbing side.'
  where id = v_winwater;

  -- "Winsupply of Las Vegas" was originally miscategorized under the combined
  -- company; it's plumbing/industrial-focused, so it belongs on the Winsupply side.
  select id into v_winsupply from companies where rep_id = v_rep_id and name = 'Winsupply';
  if v_winsupply is null then
    insert into companies (rep_id, name, category, website, notes)
    values (v_rep_id, 'Winsupply', 'distributor', 'https://www.winsupplyinc.com', 'Winsupply''s residential/commercial plumbing brand family (Winnelson Co. and generic "Winsupply of X" branches) — separate from the civil/municipal WinWater side.')
    returning id into v_winsupply;
  end if;

  update locations set company_id = v_winsupply where rep_id = v_rep_id and name = 'Winsupply of Las Vegas' and company_id = v_winwater;

  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, distributor_type, status) values
    (v_rep_id, v_winwater, 'Orange County Windustrial Co.', '1335 S Allec St', 'Anaheim', 'CA', '92805', 'socal', 'waterworks', 'prospect');

  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, distributor_type, status) values
    (v_rep_id, v_winsupply, 'Winsupply of Van Nuys', '7660 Densmore Ave', 'Van Nuys', 'CA', '91406', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_winsupply, 'Winsupply of Bakersfield (Bakersfield Winnelson Co.)', '320 Sumner St', 'Bakersfield', 'CA', '93305', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_winsupply, 'Winsupply of Burbank', '8161 Lankershim Blvd', 'North Hollywood', 'CA', '91605', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_winsupply, 'Winsupply of Los Angeles', '5201 W San Fernando Rd', 'Los Angeles', 'CA', '90039', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_winsupply, 'Winsupply of Hawthorne', '13100 S Crenshaw Blvd', 'Gardena', 'CA', '90249', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_winsupply, 'Winsupply of Pomona', '561 New York Dr', 'Pomona', 'CA', '91768', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_winsupply, 'Ontario Winnelson Co.', '9190 Hyssop Dr', 'Rancho Cucamonga', 'CA', '91730', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_winsupply, 'Temecula Winnelson Co.', '41740 Reagan Way', 'Murrieta', 'CA', '92562', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_winsupply, 'Winsupply of Hesperia', '17655 Catalpa St', 'Hesperia', 'CA', '92345', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_winsupply, 'Winsupply of San Diego', '6695 Rasha St', 'San Diego', 'CA', '92121', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_winsupply, 'Winsupply of South San Diego', '1403 Cleveland Ave', 'National City', 'CA', '91950', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_winsupply, 'Winsupply of El Cajon', '1947 John Towers Ave', 'El Cajon', 'CA', '92020', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_winsupply, 'Escondido Winsupply Co.', '631 Enterprise St', 'Escondido', 'CA', '92029', 'socal', 'plumbing', 'prospect');

  ------------------------------------------------------------------
  -- 6. Five Star Plumbing & Fire Supplies (LA-area only)
  ------------------------------------------------------------------

  insert into companies (rep_id, name, category, website, notes)
  values (v_rep_id, 'Five Star Plumbing & Fire Supplies', 'distributor', 'https://fivestarpfs.com', 'Wholesale plumbing/fire-sprinkler supply distributor, LA-area only. Note: several unrelated residential service/repair companies use similar "Five Star Plumbing" names elsewhere in the territory (Las Vegas, San Diego, Riverside, Santa Ana, Colton) — those are not this company.')
  returning id into v_five_star;

  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, distributor_type, status) values
    (v_rep_id, v_five_star, 'Five Star Plumbing & Fire Supplies - Glendale (HQ)', '918 Thompson Ave', 'Glendale', 'CA', '91201', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_five_star, 'Five Star Plumbing & Fire Supplies - Los Angeles', '1321 S Burlington Ave', 'Los Angeles', 'CA', '90006', 'socal', 'plumbing', 'prospect'),
    (v_rep_id, v_five_star, 'Five Star Plumbing & Fire Supplies - North Hollywood', '12565 Strathern St', 'North Hollywood', 'CA', '91605', 'socal', 'plumbing', 'prospect');

end $$;
