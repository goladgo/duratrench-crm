import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getLastReportRunForRep } from "@/lib/queries/reports";
import { getRepReportFloor, getRepTerritories } from "@/lib/reps";
import { TERRITORY_LABELS } from "@/lib/territory";

function formatRunTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function ReportsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const lastRun = user ? await getLastReportRunForRep(user.id) : null;
  const floor = getRepReportFloor(user?.email);
  const territoryLabel = getRepTerritories(user?.email, [])
    .map((t) => TERRITORY_LABELS[t])
    .join(" & ");

  const firstReportNote = floor
    ? `You haven't generated this yet — the first report covers your design firm activity since ${new Date(
        floor
      ).toLocaleDateString("en-US")} (your earlier bulk import is excluded).`
    : "You haven't generated this yet — the first report includes all your design firm activity to date.";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-muted-foreground">
          Generate a PDF to share outside the CRM{territoryLabel ? ` — your ${territoryLabel} territory` : ""}.
        </p>
      </div>

      <Card>
        <CardHeader className="space-y-1.5">
          <div className="flex items-center gap-2">
            <FileText className="size-5 shrink-0 text-primary" />
            <CardTitle className="text-base">Design Firm Activity</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            A PDF of your new civil engineering &amp; landscape architecture firms (with address),
            new contacts, activity notes, and any newly scheduled Lunch &amp; Learns — everything
            added since you last generated this report. Forward it to the product engineering team
            so they can update their contacts spreadsheet.
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
