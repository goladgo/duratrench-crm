-- Removes the synthetic "Jane Doe" contact created while testing the business card scanner.
delete from contacts where email = 'jane.doe@fuscoe.com';

-- Removes the synthetic "Reyes Pipe Supply" company/location/contact created while
-- testing the smart-scan new-company flow.
delete from locations where name = 'Reyes Pipe Supply';
delete from companies where name = 'Reyes Pipe Supply' and category = 'distributor';
