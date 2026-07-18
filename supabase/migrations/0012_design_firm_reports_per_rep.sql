-- Report is now per-rep (each rep generates their own PDF from their own territory's
-- data), so the cross-rep SECURITY DEFINER functions from 0011 are no longer used and
-- would actively leak other reps' rows into a rep's report. Drop them; normal RLS
-- (rep_id = auth.uid()) now scopes every report query to the logged-in rep. The
-- design_firm_report_runs table stays -- the per-rep "since" watermark is derived from
-- it by filtering generated_by = auth.uid().
drop function if exists get_new_design_firms(timestamptz);
drop function if exists get_new_design_firm_contacts(timestamptz);
drop function if exists get_new_design_firm_activity(timestamptz);
