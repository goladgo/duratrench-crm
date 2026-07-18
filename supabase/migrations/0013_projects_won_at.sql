-- "Projects Won This Week" needs to know *when* a project was won, but neither
-- projects nor opportunities track that (opportunities.close_date exists in the schema
-- but is never set anywhere in the app). Add a dedicated won_at, set only by the code
-- paths that actually transition a project to won -- not a generic updated_at, which
-- would also bump on unrelated edits like renaming and give false positives.
alter table projects add column won_at timestamptz;
