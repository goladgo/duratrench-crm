import Link from "next/link";
import { Building2, ChevronLeft, ChevronRight, HardHat, PlusCircle, Users, Utensils } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProjectFormDialog } from "@/components/project-form-dialog";
import { WeeklyPlannerBoard } from "@/components/weekly-planner-board";
import { listLocations } from "@/lib/queries/locations";
import { listPlannedVisits, listUpcomingLunchLearns } from "@/lib/queries/planner";
import { listProjectsForDashboard } from "@/lib/queries/projects";
import { TERRITORY_LABELS } from "@/lib/territory";
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
import type { PlannedVisitWithLocation, ProjectStage } from "@/lib/types";

const PROJECT_STAGE_VARIANT: Record<ProjectStage, "default" | "secondary" | "destructive"> = {
  quoted: "secondary",
  won: "default",
  lost: "destructive",
};

const SHORTCUTS = [
  { href: "/companies", label: "Distributors", icon: Building2 },
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

  const [locations, plannedVisits, upcomingLunchLearns, allProjects] = await Promise.all([
    listLocations(),
    listPlannedVisits(weekStart, weekEnd),
    listUpcomingLunchLearns(6),
    listProjectsForDashboard(),
  ]);

  // Dashboard only surfaces open work — won/lost projects have their own home on the
  // Projects tab now (stage tabs there, plus the Won Projects section).
  const openProjects = allProjects.filter((p) => p.stage === "quoted");

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

  const territoriesPresent = Array.from(new Set(locations.map((l) => l.territory_region))).map(
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
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Open Projects</h2>
          <ProjectFormDialog />
        </div>
        {openProjects.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No open projects — log a quote from a branch and tag it to a project, or start one here.
          </p>
        ) : (
          <div className="max-h-[560px] divide-y overflow-y-auto rounded-lg border">
            {openProjects.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="flex items-center justify-between gap-3 px-3 py-3 text-sm transition-colors hover:bg-muted/50"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{p.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {p.specifying_company?.name ? `Spec'd by ${p.specifying_company.name} · ` : ""}
                    {p.quote_count} quote{p.quote_count === 1 ? "" : "s"}
                  </p>
                </div>
                <Badge variant={PROJECT_STAGE_VARIANT[p.stage]} className="shrink-0">
                  {p.stage}
                </Badge>
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
