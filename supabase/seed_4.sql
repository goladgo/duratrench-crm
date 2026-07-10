-- Seed batch #4: imports firms/contacts from the rep's own outreach spreadsheet
-- (SoCal_Designers PDFs). Adds new companies/locations/contacts, and adds new
-- contacts/locations onto companies already in the CRM where they matched.
--
-- Notes on data quality, carried into company .notes where relevant:
--   - Several LA-area entries were marked "moved office" in the source sheet — the
--     address on file may be stale; flagged so the rep double-checks in person.
--   - Rows with no street address use city-only (San Diego, per surrounding context)
--     and are flagged the same way.

do $$
declare
  v_rep_id uuid;
  v_co uuid;
  v_loc uuid;
  v_loc2 uuid;
  -- existing companies we're adding to, not re-creating
  v_fuscoe uuid;
  v_mbi uuid;
  v_rick uuid;
  v_spurlock uuid;
begin
  select id into v_rep_id from auth.users where email = 'albertq31@gmail.com';
  if v_rep_id is null then
    raise exception 'No auth user found for that email — update the email in supabase/seed_4.sql';
  end if;

  ------------------------------------------------------------------
  -- 0. Additions to companies already in the CRM
  ------------------------------------------------------------------

  -- Fuscoe Engineering: new L&L-booking contact, attached to the San Diego (UTC) office
  select id into v_fuscoe from companies where rep_id = v_rep_id and name = 'Fuscoe Engineering';
  if v_fuscoe is not null then
    select id into v_loc from locations where rep_id = v_rep_id and company_id = v_fuscoe and name = 'Fuscoe Engineering - San Diego (UTC)';
    if v_loc is not null then
      insert into contacts (rep_id, location_id, name, title, email, notes) values
        (v_rep_id, v_loc, 'Nichelle Parker', 'L&L Booker', 'nparker@fuscoe.com', 'Books Lunch & Learns; firm can host L&L across multiple SoCal offices via their conference room.');
    end if;
  end if;

  -- Michael Baker International: new San Diego office (formerly Akela Engineering),
  -- distinct from their existing Granite Ridge Dr location.
  select id into v_mbi from companies where rep_id = v_rep_id and name = 'Michael Baker International';
  if v_mbi is not null then
    insert into locations (rep_id, company_id, name, address, city, state, territory_region, status) values
      (v_rep_id, v_mbi, 'Michael Baker International - San Diego (5th Ave, formerly Akela Engineering)', '2550 Fifth Ave', 'San Diego', 'CA', 'socal', 'prospect')
    returning id into v_loc;
    insert into contacts (rep_id, location_id, name, email) values
      (v_rep_id, v_loc, 'Alex Gines', 'alex.gines@mbakerintl.com');
  end if;

  -- Rick Engineering Company: two new contacts (civil + landscape sides) at the San Diego HQ.
  select id into v_rick from companies where rep_id = v_rep_id and name = 'Rick Engineering Company';
  if v_rick is not null then
    select id into v_loc from locations where rep_id = v_rep_id and company_id = v_rick and name = 'Rick Engineering - San Diego (HQ)';
    if v_loc is not null then
      insert into contacts (rep_id, location_id, name, title, email) values
        (v_rep_id, v_loc, 'Tim Gabrielson', 'Civil Engineer', 'tgabrielson@rickengineering.com'),
        (v_rep_id, v_loc, 'Tim Henderson', 'Landscape Architect', 'thenderson@rickengineering.com');
    end if;
  end if;

  -- Spurlock Landscape Architects: new contact at the existing San Diego office.
  select id into v_spurlock from companies where rep_id = v_rep_id and name = 'Spurlock Landscape Architects';
  if v_spurlock is not null then
    select id into v_loc from locations where rep_id = v_rep_id and company_id = v_spurlock and name = 'Spurlock Landscape Architects - San Diego';
    if v_loc is not null then
      insert into contacts (rep_id, location_id, name, title, email) values
        (v_rep_id, v_loc, 'Penny Ash-Carter', 'Associate', 'pacarter@spurlockland.com');
    end if;
  end if;

  ------------------------------------------------------------------
  -- 1. New civil engineering firms (LA / South Bay area)
  ------------------------------------------------------------------

  insert into companies (rep_id, name, category, website) values (v_rep_id, 'Hopper Engineering Associates', 'civil_engineering', 'http://www.hopperengineering.com/') returning id into v_co;
  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, status) values
    (v_rep_id, v_co, 'Hopper Engineering Associates - Redondo Beach', '300 Vista Del Mar', 'Redondo Beach', 'CA', '90277', 'socal', 'prospect');

  insert into companies (rep_id, name, category, website) values (v_rep_id, 'Palos Verdes Engineering Corporation', 'civil_engineering', 'http://www.pvec.com/') returning id into v_co;
  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, status) values
    (v_rep_id, v_co, 'Palos Verdes Engineering Corporation - Rolling Hills Estates', '550 Deep Valley Dr #273', 'Rolling Hills Estates', 'CA', '90274', 'socal', 'prospect')
  returning id into v_loc;
  insert into contacts (rep_id, location_id, name, title, email) values
    (v_rep_id, v_loc, 'Harry Lind', 'Sr. Civil Designer', 'harry@pvec.com');

  insert into companies (rep_id, name, category, website) values (v_rep_id, 'JMC2', 'civil_engineering', 'http://www.jmc-2.com/') returning id into v_co;
  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, status) values
    (v_rep_id, v_co, 'JMC2 - San Pedro', '411 N Harbor Blvd #201', 'San Pedro', 'CA', '90731', 'socal', 'prospect')
  returning id into v_loc;
  insert into contacts (rep_id, location_id, name, title, email) values
    (v_rep_id, v_loc, 'Jessica Ruiz', 'Office Manager', 'jruiz@jmc-2.com');

  insert into companies (rep_id, name, category, website, notes) values (v_rep_id, 'InnoDez Design and Engineering', 'civil_engineering', 'https://innodez.com/', 'Address on file may be outdated (marked "moved office") — confirm current location on next visit.') returning id into v_co;
  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, status) values
    (v_rep_id, v_co, 'InnoDez Design and Engineering - Los Angeles', '5777 W Century Blvd', 'Los Angeles', 'CA', '90045', 'socal', 'prospect');

  insert into companies (rep_id, name, category, website, notes) values (v_rep_id, '120 Degreez Engineering', 'civil_engineering', 'http://120degreez.com/', 'Address on file may be outdated (marked "moved office") — confirm current location on next visit.') returning id into v_co;
  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, status) values
    (v_rep_id, v_co, '120 Degreez Engineering - El Segundo', '222 North CA-1 #2000', 'El Segundo', 'CA', '90245', 'socal', 'prospect');

  insert into companies (rep_id, name, category, website) values (v_rep_id, 'DCA Civil Engineering Group', 'civil_engineering', 'https://www.dcacivileng.com/') returning id into v_co;
  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, status) values
    (v_rep_id, v_co, 'DCA Civil Engineering Group - Torrance', '17625 Crenshaw Blvd #300', 'Torrance', 'CA', '90504', 'socal', 'prospect')
  returning id into v_loc;
  insert into contacts (rep_id, location_id, name, title, email) values
    (v_rep_id, v_loc, 'Christopher S. Herrera', 'M.P.A.', 'cherrera@dcacivileng.com');

  insert into companies (rep_id, name, category, website, notes) values (v_rep_id, 'Integrated Engineering Consulting Engineers, Inc.', 'civil_engineering', 'http://www.ieceinc.com/', 'Address on file may be outdated (marked "moved office") — confirm current location on next visit.') returning id into v_co;
  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, status) values
    (v_rep_id, v_co, 'Integrated Engineering Consulting Engineers - Torrance', '3625 Del Amo Blvd #250', 'Torrance', 'CA', '90503', 'socal', 'prospect');

  insert into companies (rep_id, name, category, website) values (v_rep_id, 'Denn Engineers', 'civil_engineering', 'http://denn.com/') returning id into v_co;
  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, status) values
    (v_rep_id, v_co, 'Denn Engineers - Torrance', '3914 Del Amo Blvd', 'Torrance', 'CA', '90503', 'socal', 'prospect');

  insert into companies (rep_id, name, category, website, notes) values (v_rep_id, 'EPD Consultants, Inc.', 'civil_engineering', 'http://www.epd-net.com/', 'Address on file may be outdated (marked "moved office") — confirm current location on next visit.') returning id into v_co;
  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, status) values
    (v_rep_id, v_co, 'EPD Consultants - Carson', '20722 Main St', 'Carson', 'CA', '90745', 'socal', 'prospect');

  insert into companies (rep_id, name, category, website, notes) values (v_rep_id, 'Uniplan Engineering Inc', 'civil_engineering', 'https://uniplanx.com/', 'Address on file may be outdated (marked "moved office") — confirm current location on next visit.') returning id into v_co;
  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, status) values
    (v_rep_id, v_co, 'Uniplan Engineering - Carson', '500 Carson Plaza Dr Suite 201B', 'Carson', 'CA', '90746', 'socal', 'prospect');

  insert into companies (rep_id, name, category, website, notes) values (v_rep_id, 'Castillo Engineering', 'civil_engineering', 'http://castilloengineering.com/', 'Address on file may be outdated (marked "moved office") — confirm current location on next visit.') returning id into v_co;
  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, status) values
    (v_rep_id, v_co, 'Castillo Engineering - Long Beach', '1147 E Market St', 'Long Beach', 'CA', '90805', 'socal', 'prospect');

  insert into companies (rep_id, name, category, website) values (v_rep_id, 'Yorke Engineering, LLC', 'civil_engineering', 'http://www.yorkeengr.com/') returning id into v_co;
  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, status) values
    (v_rep_id, v_co, 'Yorke Engineering - Long Beach', '4300 Long Beach Blvd #701', 'Long Beach', 'CA', '90807', 'socal', 'prospect');

  insert into companies (rep_id, name, category, website, notes) values (v_rep_id, 'McGrath Civil, Inc.', 'civil_engineering', 'http://www.mcgrathcivil.com/', 'Address on file may be outdated (marked "moved office") — confirm current location on next visit.') returning id into v_co;
  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, status) values
    (v_rep_id, v_co, 'McGrath Civil - Long Beach', '3780 Kilroy Airport Way Suite 200', 'Long Beach', 'CA', '90806', 'socal', 'prospect');

  insert into companies (rep_id, name, category, website, notes) values (v_rep_id, 'VST Engineering', 'civil_engineering', 'https://www.vst.engineering/', 'Address on file may be outdated (marked "moved office") — confirm current location on next visit.') returning id into v_co;
  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, status) values
    (v_rep_id, v_co, 'VST Engineering - Long Beach', '235 E Broadway', 'Long Beach', 'CA', '90802', 'socal', 'prospect');

  insert into companies (rep_id, name, category, website) values (v_rep_id, 'Tuchscher Engineering Group, Inc.', 'civil_engineering', 'http://www.teglosangeles.com/') returning id into v_co;
  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, status) values
    (v_rep_id, v_co, 'Tuchscher Engineering Group - Long Beach', '130 Pine Ave', 'Long Beach', 'CA', '90802', 'socal', 'prospect')
  returning id into v_loc;
  insert into contacts (rep_id, location_id, name, email) values
    (v_rep_id, v_loc, 'Tuchscher Engineering Admin', 'admin@teglosangeles.com');

  insert into companies (rep_id, name, category, website) values (v_rep_id, 'Delane Engineering', 'civil_engineering', 'https://delaneengineering.com/') returning id into v_co;
  insert into locations (rep_id, company_id, name, address, city, state, territory_region, status) values
    (v_rep_id, v_co, 'Delane Engineering - Santa Monica', '2812 Santa Monica Blvd, Ste 206', 'Santa Monica', 'CA', 'socal', 'prospect')
  returning id into v_loc;
  insert into contacts (rep_id, location_id, name, title, email) values
    (v_rep_id, v_loc, 'Darren Poon', 'PE', 'dpoon@delanegroup.com');

  insert into companies (rep_id, name, category, website, notes) values (v_rep_id, 'Sierra Structural Engineering', 'civil_engineering', 'https://sierra-eng.com/', 'On plans, spec''d Alhambra Foundry.') returning id into v_co;
  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, status) values
    (v_rep_id, v_co, 'Sierra Structural Engineering - Glendale', '1010 N Central Ave', 'Glendale', 'CA', '91202', 'socal', 'prospect')
  returning id into v_loc;
  insert into contacts (rep_id, location_id, name, email) values
    (v_rep_id, v_loc, 'Derik Danialian', 'derik.sse@gmail.com');

  insert into companies (rep_id, name, category, website, notes) values (v_rep_id, 'Green MEP', 'civil_engineering', 'https://greenmep.com', 'Spec''d on THE FIFTH project (LA).') returning id into v_co;
  insert into locations (rep_id, company_id, name, address, city, state, territory_region, status) values
    (v_rep_id, v_co, 'Green MEP - Newport Beach', '20341 Irvine Ave, Unit D3', 'Newport Beach', 'CA', 'socal', 'prospect');

  ------------------------------------------------------------------
  -- 2. New landscape architecture firms (LA / South Bay area)
  ------------------------------------------------------------------

  insert into companies (rep_id, name, category, website, notes) values (v_rep_id, 'Richie-Bray Landscape Architecture', 'landscape_architecture', 'http://www.richie-bray.com/', 'Address on file may be outdated (marked "moved office") — confirm current location on next visit.') returning id into v_co;
  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, status) values
    (v_rep_id, v_co, 'Richie-Bray Landscape Architecture - Redondo Beach', 'Avenida Del Norte', 'Redondo Beach', 'CA', '90277', 'socal', 'prospect');

  insert into companies (rep_id, name, category, website) values (v_rep_id, 'Gaudet Design Group', 'landscape_architecture', 'https://www.gaudetdesigngroup.com/') returning id into v_co;
  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, status) values
    (v_rep_id, v_co, 'Gaudet Design Group - Palos Verdes Estates', '322 Tejon Pl', 'Palos Verdes Estates', 'CA', '90274', 'socal', 'prospect');

  insert into companies (rep_id, name, category, website) values (v_rep_id, 'Brooks + Scarpa Architects', 'landscape_architecture', 'http://www.brooksscarpa.com/') returning id into v_co;
  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, status) values
    (v_rep_id, v_co, 'Brooks + Scarpa Architects - Hawthorne', '3929 139th St', 'Hawthorne', 'CA', '90250', 'socal', 'prospect');

  insert into companies (rep_id, name, category, website, notes) values (v_rep_id, 'JDS Outdoor Designs', 'landscape_architecture', 'http://www.jds-outdoordesigns.com/', 'Address on file may be outdated (marked "moved office") — confirm current location on next visit.') returning id into v_co;
  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, status) values
    (v_rep_id, v_co, 'JDS Outdoor Designs - Hermosa Beach', '2447 Pacific Coast Hwy 2nd Floor', 'Hermosa Beach', 'CA', '90254', 'socal', 'prospect');

  insert into companies (rep_id, name, category, website) values (v_rep_id, 'SEED Group, Inc.', 'landscape_architecture', 'http://www.seedgroupla.com/') returning id into v_co;
  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, status) values
    (v_rep_id, v_co, 'SEED Group - Torrance', '1505 Border Ave', 'Torrance', 'CA', '90501', 'socal', 'prospect');

  insert into companies (rep_id, name, category, website, notes) values (v_rep_id, 'Kelly Sutherlin McLeod Architecture, Inc.', 'landscape_architecture', 'https://www.ksmarchitecture.com/', 'Address on file may be outdated (marked "moved office") — confirm current location on next visit.') returning id into v_co;
  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, status) values
    (v_rep_id, v_co, 'Kelly Sutherlin McLeod Architecture - Long Beach', '3827 Long Beach Blvd', 'Long Beach', 'CA', '90807', 'socal', 'prospect');

  insert into companies (rep_id, name, category, website) values (v_rep_id, 'Studio One Eleven', 'landscape_architecture', 'https://studio-111.com/') returning id into v_co;
  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, status) values
    (v_rep_id, v_co, 'Studio One Eleven - Long Beach', '245 E 3rd St', 'Long Beach', 'CA', '90802', 'socal', 'prospect')
  returning id into v_loc;
  insert into contacts (rep_id, location_id, name, title, email) values
    (v_rep_id, v_loc, 'William Mclaughlin', 'Material Resource Manager', 'william.mclaughlin@commonarts.com');

  insert into companies (rep_id, name, category, website) values (v_rep_id, 'Environ Architecture, Inc.', 'landscape_architecture', 'http://www.environarch.com/') returning id into v_co;
  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, status) values
    (v_rep_id, v_co, 'Environ Architecture - Long Beach', '100 Oceangate, Suite 200', 'Long Beach', 'CA', '90802', 'socal', 'prospect')
  returning id into v_loc;
  insert into contacts (rep_id, location_id, name, title, email) values
    (v_rep_id, v_loc, 'Connor McCulloh', 'Operations', 'connor@environarch.com');

  insert into companies (rep_id, name, category, website) values (v_rep_id, 'STUDIO-MLA', 'landscape_architecture', 'https://studio-mla.com') returning id into v_co;
  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, status) values
    (v_rep_id, v_co, 'STUDIO-MLA - Los Angeles', '251 S Mission Rd', 'Los Angeles', 'CA', '90033', 'socal', 'prospect')
  returning id into v_loc;
  insert into contacts (rep_id, location_id, name, email, notes) values
    (v_rep_id, v_loc, 'Eden', 'eden@studio-mla.com', 'Books Lunch & Learns.');

  ------------------------------------------------------------------
  -- 3. Kimley-Horn (national civil/landscape firm — new company, 2 offices)
  ------------------------------------------------------------------

  insert into companies (rep_id, name, category, website) values (v_rep_id, 'Kimley-Horn', 'civil_engineering', 'https://www.kimley-horn.com/') returning id into v_co;

  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, status) values
    (v_rep_id, v_co, 'Kimley-Horn - Long Beach', '180 E Ocean Blvd', 'Long Beach', 'CA', '90802', 'socal', 'prospect')
  returning id into v_loc;
  insert into contacts (rep_id, location_id, name, email, notes) values
    (v_rep_id, v_loc, 'Juan Madrid', 'juan.madrid@kimley-horn.com', 'Sets up Lunch & Learns.');

  insert into locations (rep_id, company_id, name, city, state, territory_region, status) values
    (v_rep_id, v_co, 'Kimley-Horn - San Diego', 'San Diego', 'CA', 'socal', 'prospect')
  returning id into v_loc2;
  insert into contacts (rep_id, location_id, name, email) values
    (v_rep_id, v_loc2, 'Jamie Santosa', 'jamie.santosa@kimley-horn.com'),
    (v_rep_id, v_loc2, 'Kayla Fong', 'kayla.fong@kimley-horn.com');

  ------------------------------------------------------------------
  -- 4. HDR (new company, San Diego — no street address on file)
  ------------------------------------------------------------------

  insert into companies (rep_id, name, category, website, notes) values (v_rep_id, 'HDR', 'civil_engineering', 'https://www.hdrinc.com', 'No street address on file — city only; confirm on next visit.') returning id into v_co;
  insert into locations (rep_id, company_id, name, city, state, territory_region, status) values
    (v_rep_id, v_co, 'HDR - San Diego', 'San Diego', 'CA', 'socal', 'prospect')
  returning id into v_loc;
  insert into contacts (rep_id, location_id, name, title, email) values
    (v_rep_id, v_loc, 'Marco Miramontes', 'Office Admin', 'marco.miramontes@hdrinc.com'),
    (v_rep_id, v_loc, 'Ashley Casatelli', null, null);

  ------------------------------------------------------------------
  -- 5. New San Diego-area civil engineering firms
  ------------------------------------------------------------------

  insert into companies (rep_id, name, category, website) values (v_rep_id, 'Coffman Specialties, Inc.', 'civil_engineering', 'https://coffmanspecialties.com') returning id into v_co;
  insert into locations (rep_id, company_id, name, address, city, state, territory_region, status) values
    (v_rep_id, v_co, 'Coffman Specialties - San Diego', '9685 Via Excelencia Suite 200', 'San Diego', 'CA', 'socal', 'prospect')
  returning id into v_loc;
  insert into contacts (rep_id, location_id, name, title, email) values
    (v_rep_id, v_loc, 'Marty Keane', 'Chief Estimator', 'marty@coffmanspecialties.com');

  insert into companies (rep_id, name, category, website) values (v_rep_id, 'Dokken Engineering', 'civil_engineering', 'https://dokkenengineering.com') returning id into v_co;
  insert into locations (rep_id, company_id, name, address, city, state, territory_region, status) values
    (v_rep_id, v_co, 'Dokken Engineering - San Diego', '1450 Frazee Rd Suite 100', 'San Diego', 'CA', 'socal', 'prospect')
  returning id into v_loc;
  insert into contacts (rep_id, location_id, name, title, email) values
    (v_rep_id, v_loc, 'Bobette Burton', 'Executive Assistant', 'bburton@dokkenengineering.com');

  insert into companies (rep_id, name, category, website) values (v_rep_id, 'K&S Engineering', 'civil_engineering', 'https://ksengr.com') returning id into v_co;
  insert into locations (rep_id, company_id, name, address, city, state, territory_region, status) values
    (v_rep_id, v_co, 'K&S Engineering - San Diego', '7801 Mission Center Ct Suite 100', 'San Diego', 'CA', 'socal', 'prospect')
  returning id into v_loc;
  insert into contacts (rep_id, location_id, name, title, email) values
    (v_rep_id, v_loc, 'Dinorah Maldonado', 'Sr. Engineering Designer', 'dino-m@ks-engr.com');

  insert into companies (rep_id, name, category, website) values (v_rep_id, 'Kleinfelder', 'civil_engineering', 'https://kleinfelder.com') returning id into v_co;
  insert into locations (rep_id, company_id, name, address, city, state, territory_region, status) values
    (v_rep_id, v_co, 'Kleinfelder - San Diego', '770 First Ave, STE 400', 'San Diego', 'CA', 'socal', 'prospect')
  returning id into v_loc;
  insert into contacts (rep_id, location_id, name, title, email) values
    (v_rep_id, v_loc, 'Nick Fontaine', 'Office Manager', 'nfontaine@kleinfelder.com');

  insert into companies (rep_id, name, category, website) values (v_rep_id, 'RailPros', 'civil_engineering', 'https://railpros.com') returning id into v_co;
  insert into locations (rep_id, company_id, name, address, city, state, territory_region, status) values
    (v_rep_id, v_co, 'RailPros - San Diego', '401 B Street Suite 2360', 'San Diego', 'CA', 'socal', 'prospect')
  returning id into v_loc;
  insert into contacts (rep_id, location_id, name, title, email) values
    (v_rep_id, v_loc, 'Stephen Hager', 'Sr. Rail Engineer', 'shager@railpros.com');

  insert into companies (rep_id, name, category, website, notes) values (v_rep_id, 'RE Staite', 'civil_engineering', 'https://restatie.com', 'No street address on file — confirm on next visit.') returning id into v_co;
  insert into locations (rep_id, company_id, name, city, state, territory_region, status) values
    (v_rep_id, v_co, 'RE Staite - San Diego', 'San Diego', 'CA', 'socal', 'prospect')
  returning id into v_loc;
  insert into contacts (rep_id, location_id, name, title, email) values
    (v_rep_id, v_loc, 'Jim Maczko', 'Estimator', 'restaite@restaite.net');

  insert into companies (rep_id, name, category, website, notes) values (v_rep_id, 'REC Consultants', 'civil_engineering', 'https://rec-consultants.com', 'Spec''d on Multifamily project (Market View Apts).') returning id into v_co;
  insert into locations (rep_id, company_id, name, address, city, state, territory_region, status) values
    (v_rep_id, v_co, 'REC Consultants - San Diego', '2970 Fifth Avenue Ste 340', 'San Diego', 'CA', 'socal', 'prospect')
  returning id into v_loc;
  insert into contacts (rep_id, location_id, name, email) values
    (v_rep_id, v_loc, 'William O''Gorman', 'william@rec-consultants.com');

  insert into companies (rep_id, name, category, website) values (v_rep_id, 'Schmidt Design Group', 'civil_engineering', 'https://schmidtdesign.com') returning id into v_co;
  insert into locations (rep_id, company_id, name, address, city, state, territory_region, status) values
    (v_rep_id, v_co, 'Schmidt Design Group - San Diego', '1310 Rosecrans St Suite G', 'San Diego', 'CA', 'socal', 'prospect')
  returning id into v_loc;
  insert into contacts (rep_id, location_id, name, title, email) values
    (v_rep_id, v_loc, 'Christy Schmidt', 'Office Manager', 'cschmidt@schmidtdesign.com');

  insert into companies (rep_id, name, category, website, notes) values (v_rep_id, 'Triton Engineers, Inc.', 'civil_engineering', 'https://tritonengineers.com', 'Works on wharfs/piers. 2-person firm, interested.') returning id into v_co;
  insert into locations (rep_id, company_id, name, address, city, state, territory_region, status) values
    (v_rep_id, v_co, 'Triton Engineers - San Diego', '2790 Truxtun Rd Suite 237', 'San Diego', 'CA', 'socal', 'prospect')
  returning id into v_loc;
  insert into contacts (rep_id, location_id, name, email) values
    (v_rep_id, v_loc, 'Troy Gillum', 'tgillium@tritonengineers.com');

  ------------------------------------------------------------------
  -- 6. New San Diego-area landscape architecture firms
  ------------------------------------------------------------------

  insert into companies (rep_id, name, category, website) values (v_rep_id, 'DGA Planning', 'landscape_architecture', 'https://dg-a.com') returning id into v_co;
  insert into locations (rep_id, company_id, name, address, city, state, territory_region, status) values
    (v_rep_id, v_co, 'DGA Planning - San Diego', '2255 Fifth Avenue Suite 105', 'San Diego', 'CA', 'socal', 'prospect')
  returning id into v_loc;
  insert into contacts (rep_id, location_id, name, title, email, notes) values
    (v_rep_id, v_loc, 'Valerie Law', 'Admin Assistant', 'vlaw@dg-a.com', 'Books Lunch & Learns.');

  insert into companies (rep_id, name, category, website, notes) values (v_rep_id, 'Environs Landscape Architecture', 'landscape_architecture', 'https://environs.us', 'Small firm, was interested in radius.') returning id into v_co;
  insert into locations (rep_id, company_id, name, address, city, state, territory_region, status) values
    (v_rep_id, v_co, 'Environs Landscape Architecture - San Diego', '3909 State Street Suite 201', 'San Diego', 'CA', 'socal', 'prospect')
  returning id into v_loc;
  insert into contacts (rep_id, location_id, name, email) values
    (v_rep_id, v_loc, 'Martin Schmidt', 'marty@environs.us');

  insert into companies (rep_id, name, category, website) values (v_rep_id, 'Evo Turf & Pavers', 'landscape_architecture', 'https://evoturfgrass.com') returning id into v_co;
  insert into locations (rep_id, company_id, name, address, city, state, territory_region, status) values
    (v_rep_id, v_co, 'Evo Turf & Pavers - El Cajon', '1100 N Magnolia Ave Ste A', 'El Cajon', 'CA', 'socal', 'prospect')
  returning id into v_loc;
  insert into contacts (rep_id, location_id, name, email) values
    (v_rep_id, v_loc, 'Zack Dawson', 'zack.dawson@evoturfgrass.com');

  insert into companies (rep_id, name, category, website) values (v_rep_id, 'Evoscapes', 'landscape_architecture', 'https://evoscapes.com') returning id into v_co;
  insert into locations (rep_id, company_id, name, address, city, state, territory_region, status) values
    (v_rep_id, v_co, 'Evoscapes - San Diego', '8990 Miramar Rd #170', 'San Diego', 'CA', 'socal', 'prospect')
  returning id into v_loc;
  insert into contacts (rep_id, location_id, name, title, email) values
    (v_rep_id, v_loc, 'Jesse York', 'Landscape Designer', 'jesse@evolscapes.com');

  insert into companies (rep_id, name, category, website) values (v_rep_id, 'GroundLevel SD', 'landscape_architecture', 'https://groundlevelsd.com') returning id into v_co;
  insert into locations (rep_id, company_id, name, address, city, state, territory_region, status) values
    (v_rep_id, v_co, 'GroundLevel SD - San Diego', '2060 India Street Suite B', 'San Diego', 'CA', 'socal', 'prospect')
  returning id into v_loc;
  insert into contacts (rep_id, location_id, name, title, email, notes) values
    (v_rep_id, v_loc, 'Luanne Merle', 'Admin Assistant', 'lmerle@groundlevelsd.com', 'Books Lunch & Learns.');

  insert into companies (rep_id, name, category, website, notes) values (v_rep_id, 'KTUA', 'landscape_architecture', 'https://ktua.com', 'No street address on file — confirm on next visit.') returning id into v_co;
  insert into locations (rep_id, company_id, name, city, state, territory_region, status) values
    (v_rep_id, v_co, 'KTUA - San Diego', 'San Diego', 'CA', 'socal', 'prospect')
  returning id into v_loc;
  insert into contacts (rep_id, location_id, name, title, email) values
    (v_rep_id, v_loc, 'Amy Diaz', 'Accountant', 'amye@ktua.com');

  insert into companies (rep_id, name, category, website, notes) values (v_rep_id, 'McCullough', 'landscape_architecture', 'https://mcculloughla.com', 'No street address on file — confirm on next visit.') returning id into v_co;
  insert into locations (rep_id, company_id, name, city, state, territory_region, status) values
    (v_rep_id, v_co, 'McCullough - San Diego', 'San Diego', 'CA', 'socal', 'prospect')
  returning id into v_loc;
  insert into contacts (rep_id, location_id, name, title, email) values
    (v_rep_id, v_loc, 'William Glockner', 'MLA, ASLA', 'william@mcculloughla.com');

  insert into companies (rep_id, name, category, website, notes) values (v_rep_id, 'OJB', 'landscape_architecture', 'https://ojb.com', 'No street address on file — confirm on next visit.') returning id into v_co;
  insert into locations (rep_id, company_id, name, city, state, territory_region, status) values
    (v_rep_id, v_co, 'OJB - San Diego', 'San Diego', 'CA', 'socal', 'prospect')
  returning id into v_loc;
  insert into contacts (rep_id, location_id, name, email) values
    (v_rep_id, v_loc, 'Stephanie Shaiken', 'sshaiken@ojb.com');

  insert into companies (rep_id, name, category, website) values (v_rep_id, 'PLSA', 'landscape_architecture', 'https://plsaengineering.com') returning id into v_co;
  insert into locations (rep_id, company_id, name, city, state, territory_region, status) values
    (v_rep_id, v_co, 'PLSA - San Diego', 'San Diego', 'CA', 'socal', 'prospect')
  returning id into v_loc;
  insert into contacts (rep_id, location_id, name, title, email) values
    (v_rep_id, v_loc, 'Jessica Herle', 'Office Manager', 'jherle@plsaengineering.com');

  ------------------------------------------------------------------
  -- 7. New contractors (San Diego area)
  ------------------------------------------------------------------

  insert into companies (rep_id, name, category, website, notes) values (v_rep_id, 'Angus Asphalt', 'contractor', 'https://angusasphalt.com', 'Fuel facilities, asphalt, and concrete contractor. No street address on file — confirm on next visit.') returning id into v_co;
  insert into locations (rep_id, company_id, name, city, state, territory_region, status) values
    (v_rep_id, v_co, 'Angus Asphalt - San Diego', 'San Diego', 'CA', 'socal', 'prospect')
  returning id into v_loc;
  insert into contacts (rep_id, location_id, name, title, email) values
    (v_rep_id, v_loc, 'Ken Hujing', 'Sr. Estimator', 'khujing@angusasphalt.com');

  insert into companies (rep_id, name, category) values (v_rep_id, 'Concrete Contractors Interstate', 'contractor') returning id into v_co;
  insert into locations (rep_id, company_id, name, address, city, state, territory_region, status) values
    (v_rep_id, v_co, 'Concrete Contractors Interstate - Poway', '12598 Stowe Dr', 'Poway', 'CA', 'socal', 'prospect')
  returning id into v_loc;
  insert into contacts (rep_id, location_id, name, title, email) values
    (v_rep_id, v_loc, 'Melissa Tidey', 'Project Coordinator', 'melissa@ccii.com');

  insert into companies (rep_id, name, category, website) values (v_rep_id, 'DPR Construction', 'contractor', 'https://dpr.com') returning id into v_co;
  insert into locations (rep_id, company_id, name, address, city, state, territory_region, status) values
    (v_rep_id, v_co, 'DPR Construction - San Diego', '5010 Shoreham Pl Suite 100', 'San Diego', 'CA', 'socal', 'prospect')
  returning id into v_loc;
  insert into contacts (rep_id, location_id, name, email) values
    (v_rep_id, v_loc, 'Mary Lou Garcia', 'mary.garcia@dpr.com');

  insert into companies (rep_id, name, category, website, notes) values (v_rep_id, 'Harper Construction Co.', 'contractor', 'https://harperconstruction.com', 'Large company, involved in DOD projects.') returning id into v_co;
  insert into locations (rep_id, company_id, name, city, state, territory_region, status) values
    (v_rep_id, v_co, 'Harper Construction Co. - San Diego', 'San Diego', 'CA', 'socal', 'prospect')
  returning id into v_loc;
  insert into contacts (rep_id, location_id, name, email) values
    (v_rep_id, v_loc, 'Jason Ridings', 'jridings@harperconstruction.com');

  insert into companies (rep_id, name, category, website, notes) values (v_rep_id, 'Hazard Construction', 'contractor', 'https://hazardconstruction.com', 'No street address on file — confirm on next visit.') returning id into v_co;
  insert into locations (rep_id, company_id, name, city, state, territory_region, status) values
    (v_rep_id, v_co, 'Hazard Construction - San Diego', 'San Diego', 'CA', 'socal', 'prospect')
  returning id into v_loc;
  insert into contacts (rep_id, location_id, name, email) values
    (v_rep_id, v_loc, 'Bryan Seeger', 'bseeger@hazardconstruction.com');

  insert into companies (rep_id, name, category, website) values (v_rep_id, 'McCarthy', 'contractor', 'https://mccarthy.com') returning id into v_co;
  insert into locations (rep_id, company_id, name, address, city, state, territory_region, status) values
    (v_rep_id, v_co, 'McCarthy - San Diego', '12830 El Camino Real Suite 200', 'San Diego', 'CA', 'socal', 'prospect')
  returning id into v_loc;
  insert into contacts (rep_id, location_id, name, title, email) values
    (v_rep_id, v_loc, 'Sharon Slay', 'Preconstruction Assistant', 'sslay@mccarthy.com');

  insert into companies (rep_id, name, category, website, notes) values (v_rep_id, 'Sundt Construction', 'contractor', 'https://sundt.com', 'Involved in DOD projects.') returning id into v_co;
  insert into locations (rep_id, company_id, name, address, city, state, territory_region, status) values
    (v_rep_id, v_co, 'Sundt Construction - San Diego', '1660 Hotel Circle N Ste 400', 'San Diego', 'CA', 'socal', 'prospect')
  returning id into v_loc;
  insert into contacts (rep_id, location_id, name, email) values
    (v_rep_id, v_loc, 'Elizabeth Tague', 'eetague@sundt.com');

  insert into companies (rep_id, name, category, website, notes) values (v_rep_id, 'Walsh Construction', 'contractor', 'https://walshgroup.com', 'Interested, covers SoCal.') returning id into v_co;
  insert into locations (rep_id, company_id, name, address, city, state, territory_region, status) values
    (v_rep_id, v_co, 'Walsh Construction - San Diego', '9915 Mira Mesa Blvd Suite 230', 'San Diego', 'CA', 'socal', 'prospect')
  returning id into v_loc;
  insert into contacts (rep_id, location_id, name, title, email) values
    (v_rep_id, v_loc, 'Steve Potter', 'Estimator', 'spotter@walshgroup.com');

end $$;
