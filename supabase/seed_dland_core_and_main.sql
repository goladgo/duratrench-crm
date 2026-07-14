-- Core & Main branch import for Dave Land (DLand@eric-sons.com). Source: Core & Main's
-- own public branch directory (coreandmain.com/branches-sitemap.xml + individual branch
-- pages, which are static/server-rendered — reliable, unlike some competitors' locator
-- sites). Covers Northern California and all four Hawaii branches (operating locally as
-- "Pacific Pipe, A Core & Main Company"). No Northern Nevada branch exists in their
-- network (their only NV branches are Las Vegas/Henderson — Southern NV, Albert's turf).
--
-- Prerequisite: Dave must have already created his account before this script is run.

do $$
declare
  v_rep_id uuid;
  v_co uuid;
begin
  select id into v_rep_id from auth.users where lower(email) = lower('DLand@eric-sons.com');
  if v_rep_id is null then
    raise exception 'No auth user found for DLand@eric-sons.com — make sure he has created his account first.';
  end if;

  insert into companies (rep_id, name, category, notes) values
    (v_rep_id, 'Core & Main', 'distributor', 'Hawaii branches operate locally as "Pacific Pipe, A Core & Main Company."')
  returning id into v_co;

  insert into locations (rep_id, company_id, name, address, city, state, zip, territory_region, distributor_type, status) values
    (v_rep_id, v_co, 'Core & Main - Lodi (Fire Protection)', '1625 S Stockton St', 'Lodi', 'CA', '95240', 'norcal', null, 'prospect'),
    (v_rep_id, v_co, 'Core & Main - Hayward (Fire Protection)', '2407 Industrial Pkwy West', 'Hayward', 'CA', '94545', 'norcal', null, 'prospect'),
    (v_rep_id, v_co, 'Core & Main - San Francisco (Fire Protection)', '111 Toland St', 'San Francisco', 'CA', '94124', 'norcal', null, 'prospect'),
    (v_rep_id, v_co, 'Core & Main - Fresno (Fire Protection)', '4710 East Commerce Ave', 'Fresno', 'CA', '93725', 'norcal', null, 'prospect'),
    (v_rep_id, v_co, 'Core & Main - Sacramento (Fire Protection)', '1120 Blumenfeld Dr', 'Sacramento', 'CA', '95815', 'norcal', null, 'prospect'),
    (v_rep_id, v_co, 'Core & Main - Woodland (Geosynthetics)', '1425 E Beamer St', 'Woodland', 'CA', '95776', 'norcal', null, 'prospect'),
    (v_rep_id, v_co, 'Core & Main - Chico (Waterworks)', '13 Jordans Place, Suite 200', 'Chico', 'CA', '95973', 'norcal', 'waterworks', 'prospect'),
    (v_rep_id, v_co, 'Core & Main - Manteca (Waterworks)', '1268 Vanderbilt Circle', 'Manteca', 'CA', '95337', 'norcal', 'waterworks', 'prospect'),
    (v_rep_id, v_co, 'Core & Main - West Sacramento (Waterworks)', '1450 Parkway Boulevard', 'West Sacramento', 'CA', '95691', 'norcal', 'waterworks', 'prospect'),
    (v_rep_id, v_co, 'Core & Main - Bakersfield (Waterworks)', '4920 Lisa Marie Ct', 'Bakersfield', 'CA', '93313', 'norcal', 'waterworks', 'prospect'),
    (v_rep_id, v_co, 'Core & Main - Oakley (Waterworks)', '1315 Main St', 'Oakley', 'CA', '94561', 'norcal', 'waterworks', 'prospect'),
    (v_rep_id, v_co, 'Core & Main - San Jose (Waterworks)', '1240 N. 13th Street', 'San Jose', 'CA', '95112', 'norcal', 'waterworks', 'prospect'),
    (v_rep_id, v_co, 'Core & Main - Santa Rosa (Waterworks)', '345 Sutton Pl', 'Santa Rosa', 'CA', '95407', 'norcal', 'waterworks', 'prospect'),
    (v_rep_id, v_co, 'Core & Main - Salinas (Waterworks)', '831 El Camino Real North', 'Salinas', 'CA', '93907', 'norcal', 'waterworks', 'prospect'),
    (v_rep_id, v_co, 'Core & Main - Redwood City (Waterworks)', '939 Broadway Street', 'Redwood City', 'CA', '94063', 'norcal', 'waterworks', 'prospect'),
    (v_rep_id, v_co, 'Core & Main - San Jose (HDPE Fusible)', '1160 N. 13th Street', 'San Jose', 'CA', '95112', 'norcal', 'waterworks', 'prospect'),
    (v_rep_id, v_co, 'Core & Main - Honolulu (Fire Protection)', '2855 Koapaka Street', 'Honolulu', 'HI', '96819', 'hawaii', null, 'prospect'),
    (v_rep_id, v_co, 'Core & Main - Pearl City, Oahu (Waterworks)', '1255 Kuala Street', 'Pearl City', 'HI', '96782', 'hawaii', 'waterworks', 'prospect'),
    (v_rep_id, v_co, 'Core & Main - Maui (Waterworks)', '82 Pulehu Place, Suite 101', 'Kahului', 'HI', '96732', 'hawaii', 'waterworks', 'prospect'),
    (v_rep_id, v_co, 'Core & Main - Big Island (Waterworks)', '74-4701 Kamanu Street', 'Kailua-Kona', 'HI', '96740', 'hawaii', 'waterworks', 'prospect');
end $$;
