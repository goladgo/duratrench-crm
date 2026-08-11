import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarCheck, FileText, Mail, MapPin, Phone, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getLastReportRunForRep } from "@/lib/queries/reports";
import { getRepReportFloor, getRepTerritories } from "@/lib/reps";
import { TERRITORY_LABELS } from "@/lib/territory";
import { getWeeklyActivity, getWeeklyQuotes, getWeeklyWonProjects } from "@/lib/queries/weekly-report";
import { addDays, formatISODate, formatShortLabel, mondayOf } from "@/lib/date-utils";
import type { ActivityType, OpportunityStage } from "@/lib/types";

function formatRunTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatMoney(amount: number | null): string {
  if (amount == null) return "—";
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

const ACTIVITY_ICON: Record<ActivityType, typeof MapPin> = { visit: MapPin, call: Phone, email: Mail };
const ACTIVITY_LABEL: Record<ActivityType, string> = { visit: "Visit", call: "Call", email: "Email" };
const STAGE_VARIANT: Record<OpportunityStage, "default" | "secondary" | "destructive" | "outline"> = {
  quoted: "secondary",
  negotiating: "outline",
  won: "default",
  lost: "destructive",
};

export default async function ReportsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const monday = mondayOf(new Date());
  const week = { start: formatISODate(monday), end: formatISODate(addDays(monday, 6)) };
  const weekLabel = `${formatShortLabel(week.start)} – ${formatShortLabel(week.end)}`;

  const [lastRun, activity, quotes, wonProjects] = await Promise.all([
    user ? getLastReportRunForRep(user.id) : Promise.resolve(null),
    getWeeklyActivity(week),
    getWeeklyQuotes(week),
    getWeeklyWonProjects(week),
  ]);

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const floor = getRepReportFloor(user?.email);
  const territoryLabel = getRepTerritories(user?.email, [])
    .map((t) => TERRITORY_LABELS[t])
    .join(" & ");

  const firstReportNote = floor
    ? `You haven't generated this yet — the first report covers your design firm activity since ${new Date(
        floor
      ).toLocaleDateString("en-US")} (your earlier bulk import is excluded).`
    : "You haven't generated this yet — the first report includes all your design firm activity to date.";

  const quoteTotal = quotes.reduce((sum, q) => sum + (q.amount ?? 0), 0);
  const wonTotal = wonProjects.reduce((sum, p) => sum + (p.amount ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-muted-foreground">
          {territoryLabel ? `Your ${territoryLabel} territory. ` : ""}
          Week of {weekLabel}.
        </p>
      </div>

      <Card>
        <CardHeader className="space-y-1.5">
          <CardTitle className="text-base">This Week&apos;s Activities</CardTitle>
          <p className="text-sm text-muted-foreground">
            {activity.rows.length} logged this week — {activity.counts.visit} visit
            {activity.counts.visit === 1 ? "" : "s"}, {activity.counts.call} call{activity.counts.call === 1 ? "" : "s"},{" "}
            {activity.counts.email} email{activity.counts.email === 1 ? "" : "s"}.
          </p>
        </CardHeader>
        <CardContent>
          {activity.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing logged yet this week.</p>
          ) : (
            <div className="max-h-[420px] space-y-3 overflow-y-auto">
              {activity.rows.map((a) => {
                const Icon = ACTIVITY_ICON[a.activityType];
                return (
                  <div key={a.id} className="flex gap-3 border-b pb-3 last:border-b-0 last:pb-0">
                    <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                        <p className="text-sm font-medium">
                          {ACTIVITY_LABEL[a.activityType]} · {a.companyName}
                          {a.locationName ? ` (${a.locationName})` : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatShortLabel(a.date)}</p>
                      </div>
                      {a.contactName && <p className="text-xs text-muted-foreground">{a.contactName}</p>}
                      <p className="text-sm text-muted-foreground">{a.notes}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-1.5">
          <div className="flex items-center gap-2">
            <CalendarCheck className="size-5 shrink-0 text-primary" />
            <CardTitle className="text-base">Daily Activity Report</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            A one-page PDF of today&apos;s visits, calls, and emails, plus any quotes or specs
            logged today — a quick visual to forward to your manager at the end of the day.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Covers {todayLabel}. Safe to regenerate anytime today.</p>
          <Button nativeButton={false} render={<a href="/api/reports/daily-activity" />}>
            <CalendarCheck className="size-4" />
            Generate Report (PDF)
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-1.5">
          <CardTitle className="text-base">This Week&apos;s Quotes</CardTitle>
          <p className="text-sm text-muted-foreground">
            {quotes.length} logged this week{quotes.length > 0 ? ` — ${formatMoney(quoteTotal)} total` : ""}.
          </p>
        </CardHeader>
        <CardContent>
          {quotes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No quotes or specs logged yet this week.</p>
          ) : (
            <div className="max-h-[420px] space-y-3 overflow-y-auto">
              {quotes.map((q) => (
                <div key={q.id} className="flex items-start justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-sm font-medium">{q.title}</p>
                      <Badge variant="outline">{q.kind === "quote" ? "Quote" : "Spec"}</Badge>
                      <Badge variant={STAGE_VARIANT[q.stage]}>{q.stage}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {q.companyName}
                      {q.locationName ? ` (${q.locationName})` : ""}
                      {q.productLine ? ` · ${q.productLine}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-medium">{formatMoney(q.amount)}</p>
                    <p className="text-xs text-muted-foreground">{formatShortLabel(q.quoteDate)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Trophy className="size-4 shrink-0 text-primary" />
            <CardTitle className="text-base">Projects Won This Week</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            {wonProjects.length} won this week{wonProjects.length > 0 ? ` — ${formatMoney(wonTotal)} total` : ""}.
          </p>
        </CardHeader>
        <CardContent>
          {wonProjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No projects marked won yet this week.</p>
          ) : (
            <div className="space-y-3">
              {wonProjects.map((p) => (
                <div key={p.id} className="flex items-start justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.companyName ?? "—"}
                      {p.locationName ? ` (${p.locationName})` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-medium">{formatMoney(p.amount)}</p>
                    {p.wonAt && (
                      <p className="text-xs text-muted-foreground">
                        {new Date(p.wonAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-1.5">
          <div className="flex items-center gap-2">
            <FileText className="size-5 shrink-0 text-primary" />
            <CardTitle className="text-base">Design Firm Activity</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            A PDF grouped by civil engineering &amp; landscape architecture firm — only firms with a
            new contact or new activity (visits, calls, emails, or a Lunch &amp; Learn scheduled or
            completed) since you last generated this report. Firms with no new activity are left out,
            so bulk-imported firms don&apos;t flood the report. Forward it to the product engineering
            team so they can update their contacts spreadsheet.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {lastRun
              ? `You last generated this on ${formatRunTimestamp(lastRun.generated_at)}. Only activity since then will be included.`
              : firstReportNote}
          </p>
          <Button nativeButton={false} render={<a href="/api/reports/design-firms" />}>
            <FileText className="size-4" />
            Generate Report (PDF)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
