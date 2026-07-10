-- Removes the synthetic "Jane Doe" contact created while testing the business card scanner.
delete from contacts where email = 'jane.doe@fuscoe.com';

-- Removes the synthetic "Reyes Pipe Supply" company/location/contact created while
-- testing the smart-scan new-company flow.
delete from locations where name = 'Reyes Pipe Supply';
delete from companies where name = 'Reyes Pipe Supply' and category = 'distributor';

-- Removes the duplicate "S & J Supply"-style company (and its location/contact) that
-- got created by the scan-match bug before the fuzzy-matching fix landed. The real
-- one is "S & J Supply Co., Inc." — this only targets a differently-named duplicate.
do $$
declare
  v_dupe_company uuid;
begin
  select id into v_dupe_company from companies
  where category = 'distributor'
    and name ilike '%s%j%supply%'
    and name <> 'S & J Supply Co., Inc.'
  limit 1;

  if v_dupe_company is not null then
    delete from contacts where location_id in (select id from locations where company_id = v_dupe_company);
    delete from locations where company_id = v_dupe_company;
    delete from companies where id = v_dupe_company;
  end if;
end $$;
