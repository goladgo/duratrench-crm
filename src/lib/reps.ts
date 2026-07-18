import type { TerritoryRegion } from "@/lib/types";

// Fixed territory assignments per rep. Deriving the dashboard subtitle purely from a
// rep's existing location data breaks the moment their assigned territory has no
// locations logged yet (e.g. Dave's Northern Nevada branches haven't been added, so
// "Northern Nevada" would silently disappear from his subtitle even though it's his
// territory). Real assignments are listed here explicitly; anyone not listed (e.g. a
// teammate just trying out the CRM with no fixed assignment) falls back to whatever
// territories show up in their own location data.
export const REP_TERRITORIES: Record<string, TerritoryRegion[]> = {
  "albertq31@gmail.com": ["socal", "vegas"],
  "dland@eric-sons.com": ["norcal", "northern_nevada", "hawaii"],
};

export function getRepTerritories(
  email: string | null | undefined,
  fallback: TerritoryRegion[]
): TerritoryRegion[] {
  const fixed = email ? REP_TERRITORIES[email.toLowerCase()] : undefined;
  return fixed ?? fallback;
}

// One-time "backlog cutoff" for the Design Firm Activity report, per rep. A rep who
// bulk-loaded firms that are *already* in the engineering team's spreadsheet (e.g.
// Albert's initial import on 2026-07-09/10) doesn't want that backlog in their first
// report. Setting a floor here means their first report only covers activity created on
// or after this timestamp; once they generate a report their normal per-rep watermark
// takes over and this floor no longer matters. Reps not listed here have no floor, so
// their first report covers everything to date (the default). Timestamps are UTC ("Z");
// Albert's floor is Monday 2026-07-13 00:00 Pacific = 07:00 UTC.
export const REP_REPORT_FLOOR: Record<string, string> = {
  "albertq31@gmail.com": "2026-07-13T07:00:00Z",
};

export function getRepReportFloor(email: string | null | undefined): string | null {
  return (email ? REP_REPORT_FLOOR[email.toLowerCase()] : undefined) ?? null;
}
