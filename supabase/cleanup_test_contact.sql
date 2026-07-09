-- Removes the synthetic "Jane Doe" contact created while testing the business card scanner.
delete from contacts where email = 'jane.doe@fuscoe.com';
