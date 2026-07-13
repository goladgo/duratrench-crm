import Link from "next/link";
import { Building2, ChevronLeft, ChevronRight, HardHat, PlusCircle, Users, Utensils } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AddStopDialog } from "@/components/add-stop-dialog";
import { PlannerStopCard } from "@/components/planner-stop-card";
import { listLocations } from "@/lib/queries/locations";
import { listPlannedVisits, listUpcomingLunchLearns } from "@/lib/queries/planner";
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
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/firms", label: "Design Firms", icon: Users },
  { href: "/contractors", label: "Contractors", icon: HardHat },
];

const WEEK_PARAM_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const params = await searchParams;
  const defaultWeekStart = formatISODate(mondayOf(new Date()));
  const weekStart = params.week && WEEK_PARAM_RE.test(params.week) ? params.week : defaultWeekStart;
  const days = weekDates(weekStart, 5); // Monday–Friday only
  const weekEnd = days[days.length - 1];
  const isCurrentWeek = weekStart === defaultWeekStart;

  const [locations, plannedVisits, upcomingLunchLearns] = await Promise.all([
    listLocations(),
    listPlannedVisits(weekStart, weekEnd),
    listUpcomingLunchLearns(6),
  ]);

  const stopsByDate = new Map<string, PlannedVisitWithLocation[]>();
  for (const day of days) stopsByDate.set(day, []);
  for (const stop of plannedVisits) {
    stopsByDate.get(stop.planned_date)?.push(stop);
  }

  const prevWeek = formatISODate(addDays(parseISODate(weekStart), -7));
  const nextWeek = formatISODate(addDays(parseISODate(weekStart), 7));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Welcome back</h1>
        <p className="text-muted-foreground">Southern California &amp; Las Vegas territory</p>
      </div>

      <Link href="/visits/new">
        <Card className="border-primary/30 bg-primary/5 transition-colors hover:bg-primary/10">
          <CardContent className="flex items-center gap-3 py-4">
            <PlusCircle className="size-6 shrink-0 text-primary" />
            <div>
              <p className="font-medium">Log a Visit</p>
              <p className="text-sm text-muted-foreground">Just made a stop? Note it before you forget.</p>
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {days.map((day, i) => {
            const stops = stopsByDate.get(day) ?? [];
            const dayLabel = `${WEEKDAY_LABELS[i]}, ${formatShortLabel(day)}`;
            return (
              <div key={day} className="space-y-2 rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">{WEEKDAY_LABELS[i]}</p>
                  <p className="text-xs text-muted-foreground">{formatShortLabel(day)}</p>
                </div>
                <div className="space-y-2">
                  {stops.map((stop) => (
                    <PlannerStopCard key={stop.id} stop={stop} />
                  ))}
                </div>
                <AddStopDialog date={day} dayLabel={dayLabel} locations={locations} />
              </div>
            );
          })}
        </div>
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
