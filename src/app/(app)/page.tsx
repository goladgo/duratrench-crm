import Link from "next/link";
import { Building2, ChevronLeft, ChevronRight, FileText, PlusCircle, Users, Utensils } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SalesChart } from "@/components/sales-chart";
import { WeeklyPlannerBoard } from "@/components/weekly-planner-board";
import { listLocations } from "@/lib/queries/locations";
import { listPlannedVisits, listUpcomingLunchLearns } from "@/lib/queries/planner";
import { getMonthlySales } from "@/lib/queries/projects";
import { TERRITORY_LABELS } from "@/lib/territory";
import { getRepTerritories } from "@/lib/reps";
import { createClient } from "@/lib/supabase/server";
import {
  addDays,
  formatISODate,
  formatMDY,
  formatShortLabel,
  mondayOf,
  parseISODate,
  WEEKDAY_LABELS,
  weekDates,
} from "@/lib/date-utils";
import type { PlannedVisitWithLocation } from "@/lib/types";

const SHORTCUTS = [
  { href: "/companies", label: "Distributors", icon: Building2 },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/reports", label: "Reports", icon: FileText },
];

const WEEK_PARAM_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; year?: string }>;
}) {
  const params = await searchParams;
  const currentYear = new Date().getFullYear();
  const salesYear = params.year && /^\d{4}$/.test(params.year) ? Number(params.year) : currentYear;
  const defaultWeekStart = formatISODate(mondayOf(new Date()));
  const weekStart = params.week && WEEK_PARAM_RE.test(params.week) ? params.week : defaultWeekStart;
  const days = weekDates(weekStart, 5); // Monday–Friday only
  const weekEnd = days[days.length - 1];
  const isCurrentWeek = weekStart === defaultWeekStart;

  const supabase = await createClient();
  const [locations, plannedVisits, upcomingLunchLearns, monthlySales, { data: { user } }] = await Promise.all([
    listLocations(),
    listPlannedVisits(weekStart, weekEnd),
    listUpcomingLunchLearns(6),
    getMonthlySales(salesYear),
    supabase.auth.getUser(),
  ]);

  // Keeps the planner's current week when flipping the sales chart between years.
  const salesYearHref = (y: number) => {
    const usp = new URLSearchParams();
    if (params.week && WEEK_PARAM_RE.test(params.week)) usp.set("week", params.week);
    if (y !== currentYear) usp.set("year", String(y));
    const qs = usp.toString();
    return qs ? `/?${qs}` : "/";
  };

  const stopsByDay = new Map<string, PlannedVisitWithLocation[]>();
  for (const day of days) stopsByDay.set(day, []);
  for (const stop of plannedVisits) {
    stopsByDay.get(stop.planned_date)?.push(stop);
  }
  const stopsByDate = days.map((day, i) => ({
    date: day,
    weekdayLabel: WEEKDAY_LABELS[i],
    stops: stopsByDay.get(day) ?? [],
  }));

  const prevWeek = formatISODate(addDays(parseISODate(weekStart), -7));
  const nextWeek = formatISODate(addDays(parseISODate(weekStart), 7));

  const locationTerritories = Array.from(new Set(locations.map((l) => l.territory_region)));
  const territoriesPresent = getRepTerritories(user?.email, locationTerritories).map(
    (r) => TERRITORY_LABELS[r]
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Welcome back</h1>
        <p className="text-muted-foreground">
          {territoriesPresent.length > 0 ? `${territoriesPresent.join(" & ")} territory` : "Your territory"}
        </p>
      </div>

      <Link href="/visits/new">
        <Card className="border-primary/30 bg-primary/5 transition-colors hover:bg-primary/10">
          <CardContent className="flex items-center gap-3 py-4">
            <PlusCircle className="size-6 shrink-0 text-primary" />
            <div>
              <p className="font-medium">Log Activity</p>
              <p className="text-sm text-muted-foreground">Just made a stop, call, or follow-up email? Note it before you forget.</p>
            </div>
          </CardContent>
        </Card>
      </Link>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-medium">This Week</h2>
            <p className="text-sm text-muted-foreground">
              {formatShortLabel(weekStart)} – {formatShortLabel(weekEnd)}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button size="icon-sm" variant="outline" nativeButton={false} render={<Link href={`/?week=${prevWeek}`} />}>
              <ChevronLeft className="size-4" />
            </Button>
            {!isCurrentWeek && (
              <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/" />}>
                Today
              </Button>
            )}
            <Button size="icon-sm" variant="outline" nativeButton={false} render={<Link href={`/?week=${nextWeek}`} />}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        <WeeklyPlannerBoard stopsByDate={stopsByDate} locations={locations} />
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-medium">Upcoming Lunch &amp; Learns</h2>
        {upcomingLunchLearns.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing scheduled yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingLunchLearns.map((ll) => (
              <Link key={ll.locationId} href={`/locations/${ll.locationId}`}>
                <Card className="h-full transition-colors hover:bg-muted/50">
                  <CardContent className="flex items-start gap-3 py-4">
                    <Utensils className="size-5 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{ll.companyName ?? ll.locationName}</p>
                      <p className="text-sm text-muted-foreground">
                        {ll.city ? `${ll.city} · ` : ""}
                        {formatMDY(ll.scheduledAt)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-medium">Sales</h2>
          <div className="flex items-center gap-1">
            <Button size="icon-sm" variant="outline" nativeButton={false} render={<Link href={salesYearHref(salesYear - 1)} />}>
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-12 text-center text-sm tabular-nums">{salesYear}</span>
            <Button size="icon-sm" variant="outline" nativeButton={false} render={<Link href={salesYearHref(salesYear + 1)} />}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
        <SalesChart months={monthlySales} year={salesYear} />
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-medium">Browse</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {SHORTCUTS.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}>
              <Card className="h-full transition-colors hover:bg-muted/50">
                <CardHeader className="flex flex-row items-center gap-2 space-y-0 py-4">
                  <Icon className="size-5 shrink-0 text-primary" />
                  <CardTitle className="text-sm">{label}</CardTitle>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
