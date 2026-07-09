-- Seed data: known distributor branches (Ferguson Waterworks, Core & Main, Reece/Fortiline,
-- WinWater/Winsupply) and civil engineering / landscape architecture firms across the
-- Bakersfield-to-San-Diego + Las Vegas territory. All rows are pre-populated as "prospect"
-- status for the rep to fill in with contacts/visit notes/quotes as they're visited.
--
-- IMPORTANT: replace the email below with your actual login email before running this
-- in the Supabase SQL Editor. Row Level Security requires every row to have a real rep_id,
-- and the SQL Editor runs without a logged-in session, so we look the id up explicitly.

do $$
declare
  v_rep_id uuid;
  v_ferguson uuid;
  v_core_main uuid;
  v_reece uuid;
  v_winwater uuid;
  v_psomas uuid;
  v_mbaker uuid;
  v_kpff uuid;
  v_dudek uuid;
  v_fuscoe uuid;
  v_hunsaker uuid;
  v_tait uuid;
  v_rrm uuid;
  v_rick uuid;
  v_webb uuid;
  v_cornerstone uuid;
  v_vtn uuid;
  v_gcw uuid;
  v_swa uuid;
  v_melendrez uuid;
  v_rjm uuid;
  v_lifescapes uuid;
  v_davidvolz uuid;
  v_spurlock uuid;
  v_verde uuid;
  v_attanasio uuid;
begin
  select id into v_rep_id from auth.users where email = 'REPLACE_WITH_YOUR_EMAIL';
  if v_rep_id is null then
    raise exception 'No auth user found for that email — update the email in supabase/seed.sql';
  end if;

  ------------------------------------------------------------------
  -- Distributors
  ------------------------------------------------------------------

  insert into companies (rep_id, name, category, website)
  values (v_rep_id, 'Ferguson Waterworks', 'distributor', 'https://www.fergusonwaterworks.com')
  returning id into v_ferguson;

  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, distributor_type, status) values
    (v_rep_id, v_ferguson, 'Ferguson Waterworks #2777', '2900 Fairhaven Dr', 'Bakersfield', 'CA', '93308', 'socal', 'waterworks', 'prospect'),
    (v_rep_id, v_ferguson, 'Ferguson Waterworks #1088', '1502 Columbia Ave', 'Riverside', 'CA', '92507', 'socal', 'waterworks', 'prospect'),
    (v_rep_id, v_ferguson, 'Ferguson Waterworks #1082', '1315 N Santiago St', 'Santa Ana', 'CA', '92701', 'socal', 'waterworks', 'prospect'),
    (v_rep_id, v_ferguson, 'Ferguson Waterworks #3615', '1313 E Hunter Ave', 'Santa Ana', 'CA', '92705', 'socal', 'waterworks', 'prospect'),
    (v_rep_id, v_ferguson, 'Ferguson Waterworks #3340', '11909 Tech Center Ct', 'Poway', 'CA', '92064', 'socal', 'waterworks', 'prospect'),
    (v_rep_id, v_ferguson, 'Ferguson Waterworks #1086', '1149 N Marshall Ave', 'El Cajon', 'CA', '92020', 'socal', 'waterworks', 'prospect'),
    (v_rep_id, v_ferguson, 'Ferguson Waterworks #1600', '740 Cape Horn Dr', 'Henderson', 'NV', '89011', 'vegas', 'waterworks', 'prospect');

  insert into companies (rep_id, name, category, website)
  values (v_rep_id, 'Core & Main', 'distributor', 'https://www.coreandmain.com')
  returning id into v_core_main;

  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, distributor_type, status) values
    (v_rep_id, v_core_main, 'Core & Main #283', '4920 Lisa Marie Ct', 'Bakersfield', 'CA', '93313', 'socal', 'waterworks', 'prospect'),
    (v_rep_id, v_core_main, 'Core & Main #594', '610 Young St', 'Santa Ana', 'CA', '92705', 'socal', 'waterworks', 'prospect'),
    (v_rep_id, v_core_main, 'Core & Main #734', '751 E Lambert Rd', 'La Habra', 'CA', '90631', 'socal', 'waterworks', 'prospect'),
    (v_rep_id, v_core_main, 'Core & Main #193', '2468 Miramonte Dr N', 'San Bernardino', 'CA', '92405', 'socal', 'waterworks', 'prospect'),
    (v_rep_id, v_core_main, 'Core & Main - Fontana', '14575 Valencia Ave', 'Fontana', 'CA', '92335', 'socal', 'waterworks', 'prospect'),
    (v_rep_id, v_core_main, 'Core & Main #499', '6088 Federal Blvd', 'San Diego', 'CA', '92114', 'socal', 'waterworks', 'prospect'),
    (v_rep_id, v_core_main, 'Core & Main #595', '1560 Linda Vista Dr', 'San Marcos', 'CA', '92078', 'socal', 'waterworks', 'prospect'),
    (v_rep_id, v_core_main, 'Core & Main #34', '2829 Losee Rd', 'North Las Vegas', 'NV', '89030', 'vegas', 'waterworks', 'prospect');

  insert into companies (rep_id, name, category, website, notes)
  values (v_rep_id, 'Reece USA (Fortiline Waterworks)', 'distributor', 'https://www.fortiline.com', 'Reece''s US waterworks branch network operates under the Fortiline Waterworks brand.')
  returning id into v_reece;

  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, distributor_type, status) values
    (v_rep_id, v_reece, 'Fortiline Waterworks - Irvine', '17138 Von Karman Ave', 'Irvine', 'CA', '92614', 'socal', 'waterworks', 'prospect'),
    (v_rep_id, v_reece, 'Fortiline Waterworks - San Diego', '7550 Miramar Rd, Ste 500', 'San Diego', 'CA', '92126', 'socal', 'waterworks', 'prospect'),
    (v_rep_id, v_reece, 'Fortiline Waterworks - Las Vegas', '4925 E Tropical Pkwy', 'Las Vegas', 'NV', '89115', 'vegas', 'waterworks', 'prospect');

  insert into companies (rep_id, name, category, website, notes)
  values (v_rep_id, 'WinWater / Winsupply Local Companies', 'distributor', 'https://www.winsupplyinc.com', 'Independently branded local Winsupply companies; coverage in this territory is sparse and only Anaheim/Fontana are waterworks-specific.')
  returning id into v_winwater;

  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, distributor_type, status) values
    (v_rep_id, v_winwater, 'Orange County Winwater Works Co.', '1617 E Ball Rd', 'Anaheim', 'CA', '92805', 'socal', 'waterworks', 'prospect'),
    (v_rep_id, v_winwater, 'Inland Empire Windustrial Co.', '10927 Jasmine St', 'Fontana', 'CA', '92337', 'socal', 'waterworks', 'prospect'),
    (v_rep_id, v_winwater, 'Winsupply of Las Vegas', '3665 W Diablo Dr, Ste 100', 'Las Vegas', 'NV', '89118', 'vegas', 'plumbing', 'prospect');

  ------------------------------------------------------------------
  -- Civil engineering firms
  ------------------------------------------------------------------

  insert into companies (rep_id, name, category, website) values (v_rep_id, 'Psomas', 'civil_engineering', 'https://www.psomas.com') returning id into v_psomas;
  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, status) values
    (v_rep_id, v_psomas, 'Psomas - Los Angeles', '865 S Figueroa St, Suite 3200', 'Los Angeles', 'CA', '90017', 'socal', 'prospect'),
    (v_rep_id, v_psomas, 'Psomas - San Diego', '401 B St, Suite 1600', 'San Diego', 'CA', '92101', 'socal', 'prospect'),
    (v_rep_id, v_psomas, 'Psomas - Santa Ana', '5 Hutton Centre Dr, Suite 300', 'Santa Ana', 'CA', '92707', 'socal', 'prospect');

  insert into companies (rep_id, name, category, website) values (v_rep_id, 'Michael Baker International', 'civil_engineering', 'https://www.mbakerintl.com') returning id into v_mbaker;
  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, status) values
    (v_rep_id, v_mbaker, 'Michael Baker International - Los Angeles', '801 S Grand Ave, Suite 250', 'Los Angeles', 'CA', '90017', 'socal', 'prospect'),
    (v_rep_id, v_mbaker, 'Michael Baker International - Santa Ana', '5 Hutton Centre Dr, Suite 500', 'Santa Ana', 'CA', '92707', 'socal', 'prospect'),
    (v_rep_id, v_mbaker, 'Michael Baker International - Ontario', '3536 Concours St, Suite 100', 'Ontario', 'CA', '91764', 'socal', 'prospect'),
    (v_rep_id, v_mbaker, 'Michael Baker International - Temecula', '40810 County Center Dr, Suite 200', 'Temecula', 'CA', '92591', 'socal', 'prospect'),
    (v_rep_id, v_mbaker, 'Michael Baker International - San Diego', '9635 Granite Ridge Dr, Suite 300', 'San Diego', 'CA', '92123', 'socal', 'prospect'),
    (v_rep_id, v_mbaker, 'Michael Baker International - Las Vegas', '1180 N Town Center Dr, Suite 100', 'Las Vegas', 'NV', '89144', 'vegas', 'prospect');

  insert into companies (rep_id, name, category, website) values (v_rep_id, 'KPFF Consulting Engineers', 'civil_engineering', 'https://www.kpff.com') returning id into v_kpff;
  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, status) values
    (v_rep_id, v_kpff, 'KPFF - Los Angeles', '700 S Flower St, Suite 2000', 'Los Angeles', 'CA', '90017', 'socal', 'prospect'),
    (v_rep_id, v_kpff, 'KPFF - San Diego', '3131 Camino Del Rio North, Suite 1080', 'San Diego', 'CA', '92108', 'socal', 'prospect');

  insert into companies (rep_id, name, category, website) values (v_rep_id, 'Dudek', 'civil_engineering', 'https://www.dudek.com') returning id into v_dudek;
  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, status) values
    (v_rep_id, v_dudek, 'Dudek - Encinitas', '687 S Coast Hwy 101, Suite 110', 'Encinitas', 'CA', '92024', 'socal', 'prospect'),
    (v_rep_id, v_dudek, 'Dudek - San Diego', '2280 Historic Decatur Rd, Suite 200', 'San Diego', 'CA', '92106', 'socal', 'prospect');

  insert into companies (rep_id, name, category, website) values (v_rep_id, 'Fuscoe Engineering', 'civil_engineering', 'https://www.fuscoe.com') returning id into v_fuscoe;
  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, status) values
    (v_rep_id, v_fuscoe, 'Fuscoe Engineering - Irvine', '15535 Sand Canyon Ave, Suite 100', 'Irvine', 'CA', '92618', 'socal', 'prospect'),
    (v_rep_id, v_fuscoe, 'Fuscoe Engineering - San Diego (UTC)', '6390 Greenwich Dr, Suite 170', 'San Diego', 'CA', '92122', 'socal', 'prospect'),
    (v_rep_id, v_fuscoe, 'Fuscoe Engineering - San Diego (Downtown)', '1620 Fifth Ave, Suite 675', 'San Diego', 'CA', '92101', 'socal', 'prospect'),
    (v_rep_id, v_fuscoe, 'Fuscoe Engineering - Ontario', '3257 E Guasti Rd, Suite 300', 'Ontario', 'CA', '91761', 'socal', 'prospect'),
    (v_rep_id, v_fuscoe, 'Fuscoe Engineering - Los Angeles', '600 Wilshire Blvd, Suite 1470', 'Los Angeles', 'CA', '90017', 'socal', 'prospect');

  insert into companies (rep_id, name, category, website) values (v_rep_id, 'Hunsaker & Associates San Diego', 'civil_engineering', 'https://www.hunsakersd.com') returning id into v_hunsaker;
  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, status) values
    (v_rep_id, v_hunsaker, 'Hunsaker & Associates - San Diego', '9707 Waples St', 'San Diego', 'CA', '92121', 'socal', 'prospect');

  insert into companies (rep_id, name, category, website) values (v_rep_id, 'TAIT & Associates', 'civil_engineering', 'https://www.tait.com') returning id into v_tait;
  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, status) values
    (v_rep_id, v_tait, 'TAIT & Associates - Santa Ana (HQ)', '701 N Parkcenter Dr', 'Santa Ana', 'CA', '92705', 'socal', 'prospect');

  insert into companies (rep_id, name, category, website) values (v_rep_id, 'RRM Design Group', 'civil_engineering', 'https://www.rrmdesign.com') returning id into v_rrm;
  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, status) values
    (v_rep_id, v_rrm, 'RRM Design Group - San Juan Capistrano', '32332 Camino Capistrano, Suite 205', 'San Juan Capistrano', 'CA', '92675', 'socal', 'prospect'),
    (v_rep_id, v_rrm, 'RRM Design Group - San Diego (Chula Vista)', '310 3rd Ave, Unit B-22', 'Chula Vista', 'CA', '91910', 'socal', 'prospect');

  insert into companies (rep_id, name, category, website) values (v_rep_id, 'Rick Engineering Company', 'civil_engineering', 'https://www.rickengineering.com') returning id into v_rick;
  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, status) values
    (v_rep_id, v_rick, 'Rick Engineering - San Diego (HQ)', '5620 Friars Rd', 'San Diego', 'CA', '92110', 'socal', 'prospect'),
    (v_rep_id, v_rick, 'Rick Engineering - Riverside', '1770 Iowa Ave, Suite 100', 'Riverside', 'CA', '92507', 'socal', 'prospect');

  insert into companies (rep_id, name, category, website) values (v_rep_id, 'Albert A. Webb Associates', 'civil_engineering', 'https://www.webbassociates.com') returning id into v_webb;
  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, status) values
    (v_rep_id, v_webb, 'Albert A. Webb Associates - Riverside', '3788 McCray St', 'Riverside', 'CA', '92506', 'socal', 'prospect');

  insert into companies (rep_id, name, category, website) values (v_rep_id, 'Cornerstone Engineering', 'civil_engineering', 'https://www.cornerstoneeng.com') returning id into v_cornerstone;
  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, status) values
    (v_rep_id, v_cornerstone, 'Cornerstone Engineering - Bakersfield', '5509 Young St', 'Bakersfield', 'CA', '93311', 'socal', 'prospect');

  insert into companies (rep_id, name, category, website) values (v_rep_id, 'VTN Nevada', 'civil_engineering', 'https://www.vtnnv.com') returning id into v_vtn;
  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, status) values
    (v_rep_id, v_vtn, 'VTN Nevada - Las Vegas', '2727 S Rainbow Blvd', 'Las Vegas', 'NV', '89146', 'vegas', 'prospect');

  insert into companies (rep_id, name, category, website) values (v_rep_id, 'GCW Engineering', 'civil_engineering', 'https://www.gcwengineering.com') returning id into v_gcw;
  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, status) values
    (v_rep_id, v_gcw, 'GCW Engineering - Las Vegas', '1555 S Rainbow Blvd', 'Las Vegas', 'NV', '89146', 'vegas', 'prospect');

  ------------------------------------------------------------------
  -- Landscape architecture firms
  ------------------------------------------------------------------

  insert into companies (rep_id, name, category, website) values (v_rep_id, 'SWA Group', 'landscape_architecture', 'https://www.swagroup.com') returning id into v_swa;
  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, status) values
    (v_rep_id, v_swa, 'SWA Group - Los Angeles', '811 W 7th St, Floor 8', 'Los Angeles', 'CA', '90017', 'socal', 'prospect');

  insert into companies (rep_id, name, category, website) values (v_rep_id, 'Melendrez', 'landscape_architecture', null) returning id into v_melendrez;
  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, status) values
    (v_rep_id, v_melendrez, 'Melendrez - Los Angeles', '617 S Olive St, 11th Floor', 'Los Angeles', 'CA', '90014', 'socal', 'prospect');

  insert into companies (rep_id, name, category, website) values (v_rep_id, 'RJM Design Group', 'landscape_architecture', 'https://www.rjmdesigngroup.com') returning id into v_rjm;
  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, status) values
    (v_rep_id, v_rjm, 'RJM Design Group - San Juan Capistrano', '31591 Camino Capistrano', 'San Juan Capistrano', 'CA', '92675', 'socal', 'prospect');

  insert into companies (rep_id, name, category, website) values (v_rep_id, 'Lifescapes International', 'landscape_architecture', 'https://www.lifescapesintl.com') returning id into v_lifescapes;
  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, status) values
    (v_rep_id, v_lifescapes, 'Lifescapes International - Newport Beach', '4930 Campus Dr', 'Newport Beach', 'CA', '92660', 'socal', 'prospect');

  insert into companies (rep_id, name, category, website) values (v_rep_id, 'David Volz Design Landscape Architects', 'landscape_architecture', 'https://www.dvolzdesign.com') returning id into v_davidvolz;
  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, status) values
    (v_rep_id, v_davidvolz, 'David Volz Design - Costa Mesa', '151 Kalmus Dr, Unit M8', 'Costa Mesa', 'CA', '92626', 'socal', 'prospect');

  insert into companies (rep_id, name, category, website) values (v_rep_id, 'Spurlock Landscape Architects', 'landscape_architecture', 'https://www.spurlock-land.com') returning id into v_spurlock;
  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, status) values
    (v_rep_id, v_spurlock, 'Spurlock Landscape Architects - San Diego', '2122 Hancock St', 'San Diego', 'CA', '92110', 'socal', 'prospect');

  insert into companies (rep_id, name, category, website, notes) values (v_rep_id, 'Verde Design, Inc.', 'landscape_architecture', 'https://www.verdedesigninc.com', 'HQ in Santa Clara (NorCal); this is their Inland Empire satellite office. Does both landscape architecture and civil engineering.') returning id into v_verde;
  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, status) values
    (v_rep_id, v_verde, 'Verde Design - Riverside', '3685 Main St, Suite 350', 'Riverside', 'CA', '92501', 'socal', 'prospect');

  insert into companies (rep_id, name, category, website) values (v_rep_id, 'Attanasio Landscape Architecture', 'landscape_architecture', 'https://www.ala-lv.com') returning id into v_attanasio;
  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, status) values
    (v_rep_id, v_attanasio, 'Attanasio Landscape Architecture - Las Vegas', '1180 N Town Center Dr, Suite 280', 'Las Vegas', 'NV', '89144', 'vegas', 'prospect');

end $$;
