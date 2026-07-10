-- Tracks Lunch & Learn status per location (a firm can have multiple offices,
-- each independently scheduled/completed).
alter table locations
  add column lunch_learn_completed_at date,
  add column lunch_learn_scheduled_at date;
