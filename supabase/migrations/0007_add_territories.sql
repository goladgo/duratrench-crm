-- Adds the three new territory regions needed for the Northern California rep
-- (covering Northern CA, Northern Nevada, and Hawaii). Existing 'socal' and 'vegas'
-- values are untouched. Each rep's locations stay scoped to whichever of these five
-- values are relevant to their own territory (RLS keeps reps' data fully separate).

alter type territory_region add value if not exists 'norcal';
alter type territory_region add value if not exists 'northern_nevada';
alter type territory_region add value if not exists 'hawaii';
