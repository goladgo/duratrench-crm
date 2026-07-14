@AGENTS.md

# Project: duratrench-crm

Next.js + Supabase + Claude Haiku 4.5 business-card-scanning CRM for territory sales reps. Deployed on Vercel. RLS on every table scoped by `rep_id = auth.uid()` — this is what isolates each rep's data; a new rep just needs their own Supabase Auth account, no extra multi-tenancy code.

Reps:
- Albert (albertq31@gmail.com) — Southern California & Las Vegas.
- Dave Land (DLand@eric-sons.com) — Northern California, Northern Nevada, Hawaii. Onboarded via self-service signup at `/login`; "Confirm email" was disabled in Supabase Auth settings to avoid the free-tier email rate limit.

## Status as of 2026-07-14

**Done:**
- Fixed a production crash on `/projects/[id]`: `ProjectStageButton` was receiving a bare Lucide icon component as a prop from a Server Component, which Next.js's RSC boundary forbids (functions can't cross Server→Client). Fixed by changing the prop to `ReactNode` and passing pre-rendered JSX (`icon={<XCircle className="size-4" />}`) from the caller. If a similar "Functions cannot be passed directly to Client Components" error shows up elsewhere, look for the same pattern.
- `territory_region` enum expanded from 2 values to 5 (`socal`, `vegas`, `norcal`, `northern_nevada`, `hawaii`) via `supabase/migrations/0007_add_territories.sql`. Labels/options centralized in `src/lib/territory.ts` (`TERRITORY_LABELS`, `TERRITORY_OPTIONS`) — use these instead of hardcoding territory lists.
- Dashboard territory subtitle is now computed dynamically per-rep from their own locations data instead of being hardcoded.
- Distributor data imported for Dave via SQL scripts run in Supabase's SQL editor (not run by me directly — I write them, user pastes and runs):
  - `supabase/seed_dland_distributors.sql` — 15 verified branches (Underground Republic Water Works, Slakey Brothers, PACE Supply, Ferguson) sourced from Dave's own curated Google Maps list. Partial by design — user chose to cap scope here rather than risk mismatched scraped data.
  - `supabase/seed_dland_core_and_main.sql` — 20 branches (16 Norcal CA + 4 Hawaii), sourced from Core & Main's own static branch-page sitemap (reliable). **Given to user to run but not yet confirmed run.**

**Not done / open:**
- Ferguson, PACE Supply, Slakey Brothers, and Reece full-territory branch data (beyond the 15 already in `seed_dland_distributors.sql`) was NOT imported. Ferguson's store-locator pages were found to be dynamically personalized (a Chico, CA URL returned an Ohio address) rather than statically scoped to the URL — unreliable to scrape. PACE Supply and Slakey Brothers weren't attempted for full coverage (their locator pages are JS-rendered, likely same problem). Reece wasn't attempted at all. Current recommendation given to user: have Dave add these branches himself via the app (Smart Scan / Add Location) as he visits them, rather than risk bad data from scraping.
- If resuming this data-import work: the reliable method is a static sitemap + per-branch static HTML page (like Core & Main's `branches-sitemap.xml`) — check if PACE Supply, Slakey Brothers, or Reece expose something similar before falling back to Google Maps DOM scraping.

## Status as of 2026-07-14 (session 2): Activity log + Projects tab

**Done (migration 0008 written, NOT yet run by user — hand off `supabase/migrations/0008_activities.sql`):**
- "Log Visit" generalized into "Log Activity" everywhere in the UI (nav, dashboard card, location profile, weekly planner stop card). Underlying table is still `visit_notes` (kept the name — renaming would've meant touching RLS/FKs for no functional gain), but it now has an `activity_type` enum column (`'visit' | 'call' | 'email'`, default `'visit'`) and a nullable `opportunity_id` FK so a call/email can optionally be logged as a follow-up on a specific quote (shows as "Re: {quote title}" on the location's Activity tab). Quote linkage is optional by the user's own choice, not required.
- New `/projects` tab (added to `top-nav.tsx` and `bottom-nav.tsx`) with: stage-filter tabs (All/Quoted/Won/Lost) over the full project list, a "Won Projects" section showing who won each one (distributor + branch + $ amount, via `listWonProjects()`), and a "Distributor Performance" table (quote volume, wins count, $ won per distributor, via `getDistributorPerformance()`) — both new queries in `src/lib/queries/projects.ts`. Per explicit user choice, the dashboard's existing compact Projects section was **left as-is** (not replaced/removed) — the new tab is additive, not a migration.
- `ActivityType`, `WonProjectSummary`, `DistributorPerformance` types added to `src/lib/types.ts`; `VisitNote` extended with `activity_type`/`opportunity_id`.

**Environment note — don't trust `npx tsc`/`next build` run via the sandbox bash tool on this repo.** The bash tool's mount of this Windows folder truncates/corrupts reads of pre-existing CRLF-terminated files (confirmed: a file read cleanly via the `Read` tool cut off mid-string at the exact same byte every time when read through `bash`/`awk`/`cat`, and freshly-`Write`-tool-created LF-only files in the same folder read back fine). A `tsc --noEmit` run this session flagged ~100 "errors" across files never touched this session — all spurious, an artifact of the mount, not real bugs. Verify future non-trivial changes by re-reading edited files with the `Read` tool and reviewing for balanced braces/tags/types by hand, not by trusting a bash-run compiler on this particular workspace mount.

## Status as of 2026-07-14 (session 3): Contractor wins, distributor status cleanup, contact counts

**Done — migration 0009 run and confirmed, all fixes deployed clean (`dpl_2CsCFKkRe8TAdu5opPfXNqkDEvGA`):**
- Fixed contractor quotes incorrectly defaulting to `kind: 'spec'` (same bug as design firms) in `locations/[id]/page.tsx` and `visits/log/[id]/page.tsx` — contractors now default to `kind: 'quote'` so their opportunities are project-linkable. This was a prerequisite for the next item.
- New "Projects Won by Contractors" section on `/projects`, below Distributor Rep Performance — filters `listWonProjects()` results by `winner_company_category === "contractor"`. Required adding `category` to the company join in `listWonProjects()` and a new `winner_company_category` field on `WonProjectSummary`.
- Distributor location status simplified to Active/Inactive only (no more Prospect) — `src/lib/location-status.ts` centralizes `defaultStatusForCategory`/`statusOptionsForCategory`/`STATUS_LABELS`. Design firms/contractors keep Prospect → Active → Inactive, with auto-promotion to Active when a Lunch & Learn is marked completed (`updateLunchLearn` in `actions/locations.ts`). New `LocationStatusSelect` client component wired onto the location profile page (replacing the old static badge) so a rep can manually flip a design firm/contractor to Inactive if they don't want to work with us — this was previously impossible since `updateLocationStatus` existed but was never called from any UI.
- `LocationFormDialog` and `createFromScan`/Smart Scan now pick the correct default/allowed statuses based on the company's category instead of always defaulting to `prospect`.
- Company profile pages (`/companies/[id]`) now show a contact count per branch card, with a highlighted "No contacts yet" warning (red, `UserX` icon) so it's obvious which branches still need contact info collected.
- Migration `0009_distributor_status_cleanup.sql` backfills existing distributor locations that were seeded/created as `prospect` (mostly Dave's Norcal imports) to `active`, matching the new UI rule.

**base-ui Select `onValueChange` gotcha (caused 3 real Vercel build failures this session, not the CRLF mount issue):** `Select` (`src/components/ui/select.tsx`, wraps `@base-ui/react/select`'s generic `SelectRoot<Value, Multiple>`) infers `Value` from `value`/`defaultValue`/`items` props. If none of those anchor the type (e.g. an uncontrolled Select with just `name` + `onValueChange`), TS infers `Value` as `{}`, and `onValueChange`'s callback param becomes `{} | null` — incompatible with any concretely-typed state setter. Fix: explicitly annotate the callback's first param, e.g. `onValueChange={(value: string | null) => setX(value ?? undefined)}`. Also remember the callback param type is always `T | null` (never `undefined`) even on a *controlled* Select whose `value` prop is a non-nullable union like `LocationStatus` — annotate the handler as `(value: LocationStatus | null)` and guard/coerce the `null` case, don't type it as just `string`. This bit both `location-form-dialog.tsx` and `location-status-select.tsx` in one session; check any new `onValueChange` usage against this before considering a Select change done.

## Google Maps scraping gotchas (if ever scraping a Maps list again)

- Clicking a sidebar list item auto-scrolls the list, which invalidates previously-cached element refs/positions even though the ref ID looks still valid. Always re-`find` the target element by its unique name text immediately before each click — never reuse a ref captured before an intervening click.
- Also insert a short wait (1-2s) between a click and a `find` call — without it, `find` can return the pre-click state.
- Given the two issues above, treat Maps-list scraping as slow-and-verified, not fast — this was an explicit user preference when data accuracy is business-critical.

