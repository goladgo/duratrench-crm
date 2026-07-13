// Monday-start week helpers for the weekly planner. Uses local server time —
// fine for a single-rep territory CRM, not meant to be timezone-general.

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function mondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday ... 6 = Saturday
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function formatISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatShortLabel(isoDate: string): string {
  return parseISODate(isoDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// e.g. "07/13/2026" — used for the Lunch & Learn list, where a full date reads clearer.
export function formatMDY(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${m}/${d}/${y}`;
}

export const WEEKDAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function weekDates(mondayIso: string, count = 7): string[] {
  const monday = parseISODate(mondayIso);
  return Array.from({ length: count }, (_, i) => formatISODate(addDays(monday, i)));
}
