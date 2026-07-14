import Link from "next/link";
import { Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectFormDialog } from "@/components/project-form-dialog";
import {
  getDistributorPerformance,
  getDistributorRepPerformance,
  listProjectsForDashboard,
  listWonProjects,
} from "@/lib/queries/projects";
import type { ProjectListItem, ProjectStage } from "@/lib/types";

const PROJECT_STAGE_VARIANT: Record<ProjectStage, "default" | "secondary" | "destructive"> = {
  quoted: "secondary",
  won: "default",
  lost: "destructive",
};

const STAGE_TABS: { value: "all" | ProjectStage; label: string }[] = [
  { value: "all", label: "All" },
  { value: "quoted", label: "Quoted" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

function formatMoney(value: number | null) {
  if (value == null) return "—";
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function ProjectRow({ project }: { project: ProjectListItem }) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="flex items-center justify-between gap-3 px-3 py-3 text-sm transition-colors hover:bg-muted/50"
    >
      <div className="min-w-0">
        <p className="truncate font-medium">{project.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {project.specifying_company?.name ? `Spec'd by ${project.specifying_company.name} · ` : ""}
          {project.quote_count} quote{project.quote_count === 1 ? "" : "s"}
        </p>
      </div>
      <Badge variant={PROJECT_STAGE_VARIANT[project.stage]} className="shrink-0">
        {project.stage}
      </Badge>
    </Link>
  );
}

export default async function ProjectsPage() {
  const [projects, wonProjects, distributorPerformance, distributorRepPerformance] = await Promise.all([
    listProjectsForDashboard(200),
    listWonProjects(),
    getDistributorPerformance(),
    getDistributorRepPerformance(),
  ]);

  // Sometimes the order comes straight from a contractor rather than through a
  // distributor branch — worth calling those out separately since they're a
  // different sales path, not a distributor win.
  const contractorWonProjects = wonProjects.filter((p) => p.winner_company_category === "contractor");

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-muted-foreground">Every job you&apos;re tracking, who won it, and how each distributor is performing.</p>
        </div>
        <ProjectFormDialog />
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          {STAGE_TABS.map((t) => {
            const count = t.value === "all" ? projects.length : projects.filter((p) => p.stage === t.value).length;
            return (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label} ({count})
              </TabsTrigger>
            );
          })}
        </TabsList>
        {STAGE_TABS.map((t) => {
          const filtered = t.value === "all" ? projects : projects.filter((p) => p.stage === t.value);
          return (
            <TabsContent key={t.value} value={t.value} className="pt-4">
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing here yet.</p>
              ) : (
                <div className="divide-y rounded-lg border">
                  {filtered.map((p) => (
                    <ProjectRow key={p.id} project={p} />
                  ))}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      <div className="space-y-3">
        <h2 className="text-lg font-medium">Won Projects</h2>
        {wonProjects.length === 0 ? (
          <p className="text-sm text-muted-foreground">No projects won yet.</p>
        ) : (
          <div className="space-y-3">
            {wonProjects.map((p) => (
              <Card key={p.id}>
                <CardContent className="flex items-center gap-3 py-4">
                  <Trophy className="size-5 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <Link href={`/projects/${p.id}`} className="font-medium hover:underline">
                      {p.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      Won by {p.winner_company_name ?? p.winner_location_name ?? "—"}
                      {p.winner_company_name && p.winner_location_name ? ` — ${p.winner_location_name}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-medium">{formatMoney(p.amount)}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-medium">Distributor Performance</h2>
        {distributorPerformance.length === 0 ? (
          <p className="text-sm text-muted-foreground">No quotes logged yet.</p>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Distributor</TableHead>
                    <TableHead className="text-right">Quotes</TableHead>
                    <TableHead className="text-right">Wins</TableHead>
                    <TableHead className="text-right">$ Won</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {distributorPerformance.map((d) => (
                    <TableRow key={d.company_id}>
                      <TableCell>
                        <Link href={`/companies/${d.company_id}`} className="hover:underline">
                          {d.company_name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right">{d.quote_count}</TableCell>
                      <TableCell className="text-right">{d.wins_count}</TableCell>
                      <TableCell className="text-right">{formatMoney(d.won_value)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-medium">Distributor Rep Performance</h2>
        {distributorRepPerformance.length === 0 ? (
          <p className="text-sm text-muted-foreground">No projects won yet.</p>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rep</TableHead>
                    <TableHead>Distributor</TableHead>
                    <TableHead className="text-right">Wins</TableHead>
                    <TableHead className="text-right">$ Won</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {distributorRepPerformance.map((r) => (
                    <TableRow key={r.contact_id}>
                      <TableCell>{r.contact_name}</TableCell>
                      <TableCell className="text-muted-foreground">{r.company_name ?? "—"}</TableCell>
                      <TableCell className="text-right">{r.wins_count}</TableCell>
                      <TableCell className="text-right">{formatMoney(r.won_value)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-medium">Projects Won by Contractors</h2>
        {contractorWonProjects.length === 0 ? (
          <p className="text-sm text-muted-foreground">No projects won directly by a contractor yet.</p>
        ) : (
          <div className="space-y-3">
            {contractorWonProjects.map((p) => (
              <Card key={p.id}>
                <CardContent className="flex items-center gap-3 py-4">
                  <Trophy className="size-5 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <Link href={`/projects/${p.id}`} className="font-medium hover:underline">
                      {p.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      Won by {p.winner_company_name ?? p.winner_location_name ?? "—"}
                      {p.winner_company_name && p.winner_location_name ? ` — ${p.winner_location_name}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-medium">{formatMoney(p.amount)}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
