-- Adds "Contractor" as a third firm category alongside civil_engineering and
-- landscape_architecture (general/asphalt/concrete contractors from the designer
-- outreach list, distinct from design firms but tracked the same way).
alter type company_category add value 'contractor';
