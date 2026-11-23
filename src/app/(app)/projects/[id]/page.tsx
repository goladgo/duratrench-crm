import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject, listDesignFirmCompaniesForPicker } from "@/lib/queries/projects";
import { listQuoteContacts, listQuoteLocations } from "@/lib/queries/quote-locations";
import { AddProjectQuoteDialog } from "@/components/add-project-quote-dialog";
import { QuoteContactDialog } from "@/components/quote-contact-dialog";
import { ImportBiddersCard } from "@/components/import-bidders-card";
import { BidderWinnerDialog } from "@/components/bidder-winner-dialog";
import { SoldPriceDialog } from "@/components/sold-price-dialog";
import { listProjectBidders, type ProjectBidder } from "@/lib/queries/project-bidders";
import { removeBidder } from "@/lib/actions/project-bidders";
import { markProjectLost, reopenProject, deleteProject } from "@/lib/actions/projects";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteButton } from "@/components/delete-button";
import { ProjectDetailsForm } from "@/components/project-details-form";
import { ProjectStageButton } from "@/components/project-stage-button";
import { DeclareWinnerButton } from "@/components/declare-winner-button";
import { RotateCcw, XCircle, Trophy, User } from "lucide-react";
import type { ProjectStage } from "@/lib/types";

const STAGE_VARIANT: Record<ProjectStage, "default" | "secondary" | "destructive"> = {
  quoted: "secondary",
  won: "default",
  lost: "destructive",
};

function formatMoney(value: number | null) {
  if (value == null) return null;
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

const BIDDER_GROUPS: { label: string; match: (b: ProjectBidder) => boolean }[] = [
  { label: "Distributors", match: (b) => b.category === "distributor" },
  { label: "Contractors", match: (b) => b.category === "contractor" },
  { label: "Other", match: (b) => b.category !== "distributor" && b.category !== "contractor" },
];

function bidderCompanyLine(b: ProjectBidder): string {
  const company = b.companyName ?? "";
  const branch = company && b.locationName.toLowerCase().includes(company.toLowerCase()) ? b.locationName : company ? `${company} — ${b.locationName}` : b.locationName;
  return b.city && !branch.includes(b.city) ? `${branch} · ${b.city}` : branch;
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [project, designFirms, quoteLocations, quoteContacts, bidders] = await Promise.all([
    getProject(id),
    listDesignFirmCompaniesForPicker(),
    listQuoteLocations(),
    listQuoteContacts(),
    listProjectBidders(id),
  ]);
  if (!project) notFound();

  const winningQuote = project.quotes.find((q) => q.id === project.winning_opportunity_id);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-2">
          <Badge variant={STAGE_VARIANT[project.stage]}>{project.stage}</Badge>
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          {project.odis_id && (
            <p className="text-sm text-muted-foreground">
              ODIS #{project.odis_id}
              {project.odis_status ? ` · ${project.odis_status}` : ""}
              {project.odis_price != null ? ` · ${formatMoney(project.odis_price)}` : ""}
              {project.odis_follow_up_date ? ` · Follow up ${project.odis_follow_up_date}` : ""}
            </p>
          )}
          {project.specifying_company && (
            <Link
              href={`/companies/${project.specifying_company.id}`}
              className="block text-sm text-primary hover:underline"
            >
              Spec'd by {project.specifying_company.name}
            </Link>
          )}
        </div>
        <DeleteButton
          action={deleteProject}
          args={[project.id]}
          variant="outline"
          size="sm"
          label="Delete Project"
          confirmMessage={`Delete "${project.name}"? Its quotes will stay logged under their branches, just no longer grouped under this project. This can't be undone.`}
        />
      </div>

      {project.stage === "won" && winningQuote && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center gap-3 py-4">
            <Trophy className="size-6 shrink-0 text-primary" />
            <div>
              <p className="font-medium">
                Won by {winningQuote.locations?.companies?.name ?? winningQuote.locations?.name ?? "—"}
                {winningQuote.locations?.companies?.name && winningQuote.locations?.name
                  ? ` — ${winningQuote.locations.name}`
                  : ""}
              </p>
              <p className="text-sm text-muted-foreground">
                {winningQuote.contacts?.name ? `${winningQuote.contacts.name} · ` : ""}
                {winningQuote.amount != null ? `Sold for ${formatMoney(winningQuote.amount)}` : "No sold price yet"}
                {project.odis_price != null && project.odis_price !== winningQuote.amount
                  ? ` (estimate ${formatMoney(project.odis_price)})`
                  : ""}
              </p>
            </div>
            <div className="ml-auto">
              <SoldPriceDialog projectId={project.id} currentAmount={winningQuote.amount} />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        {project.stage === "quoted" && (
          <ProjectStageButton
            action={markProjectLost}
            projectId={project.id}
            label="Mark Project as Lost"
            icon={<XCircle className="size-4" />}
            confirmMessage={`Mark "${project.name}" as lost? This means none of your branches' quotes won the job.`}
          />
        )}
        {project.stage !== "quoted" && (
          <ProjectStageButton
            action={reopenProject}
            projectId={project.id}
            label="Reopen Project"
            icon={<RotateCcw className="size-4" />}
          />
        )}
      </div>

      <Card>
        <CardContent className="py-4">
          <ProjectDetailsForm project={project} designFirms={designFirms} />
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-medium">Bidders ({bidders.length})</h2>
          <ImportBiddersCard projectId={project.id} />
        </div>
        {bidders.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No bidders yet. Use Import bidders from ODIS to paste who is bidding this job.
          </p>
        ) : (
          <div className="space-y-4">
            {BIDDER_GROUPS.map((group) => {
              const rows = bidders.filter(group.match);
              if (rows.length === 0) return null;
              return (
                <div key={group.label} className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    {group.label} ({rows.length})
                  </h3>
                  <div className="divide-y rounded-lg border">
                    {rows.map((b) => {
                      const quote =
                        project.quotes.find((q) => q.location_id === b.locationId && q.contact_id === b.contactId) ??
                        project.quotes.find((q) => q.location_id === b.locationId);
                      const isWinner = !!winningQuote && winningQuote.location_id === b.locationId;
                      return (
                        <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 text-sm">
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <Link href={`/locations/${b.locationId}`} className="font-medium hover:underline">
                                {b.name}
                              </Link>
                              {isWinner && <Badge>Winner</Badge>}
                              {quote && !isWinner && <Badge variant="outline">Quoted</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground">{bidderCompanyLine(b)}</p>
                            <p className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                              {b.phone && (
                                <a href={`tel:${b.phone}`} className="hover:underline">
                                  {b.phone}
                                </a>
                              )}
                              {b.email && (
                                <a href={`mailto:${b.email}`} className="hover:underline">
                                  {b.email}
                                </a>
                              )}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            {project.stage === "quoted" && (
                              <BidderWinnerDialog
                                projectId={project.id}
                                bidderId={b.id}
                                bidderLabel={`${b.name}, ${bidderCompanyLine(b)}`}
                                defaultPrice={quote?.amount ?? project.odis_price}
                                otherQuoteCount={project.quotes.length - (quote ? 1 : 0)}
                              />
                            )}
                            <DeleteButton
                              action={removeBidder}
                              args={[b.id, project.id]}
                              confirmMessage={`Remove ${b.name} from the bidders list?`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-medium">Quotes ({project.quotes.length})</h2>
          {project.stage === "quoted" && (
            <AddProjectQuoteDialog
              project={{ id: project.id, name: project.name }}
              locations={quoteLocations}
              contacts={quoteContacts}
              defaultAmount={project.odis_price}
            />
          )}
        </div>
        {project.quotes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No quotes yet. Use Add quote to log who quoted it.
          </p>
        ) : (
          <div className="space-y-3">
            {project.quotes.map((q) => (
              <Card key={q.id}>
                <CardContent className="space-y-1 py-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{q.title}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{q.stage}</Badge>
                      {project.stage === "quoted" && (
                        <DeclareWinnerButton
                          projectId={project.id}
                          opportunityId={q.id}
                          otherQuoteCount={project.quotes.length - 1}
                        />
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                    <span>
                      {q.locations?.companies?.name ?? "Independent"}
                      {q.locations?.name ? ` — ${q.locations.name}` : ""}
                      {q.locations?.city ? ` · ${q.locations.city}` : ""}
                    </span>
                    <span>{formatMoney(q.amount)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    {q.contacts?.name && (
                      <>
                        <User className="size-3.5 shrink-0" />
                        {q.contacts.name}
                      </>
                    )}
                    <QuoteContactDialog
                      opportunityId={q.id}
                      locationId={q.location_id}
                      branchLabel={`${q.locations?.companies?.name ?? "Independent"}${q.locations?.name ? ` — ${q.locations.name}` : ""}`}
                      currentName={q.contacts?.name ?? null}
                    />
                  </div>
                  {q.locations?.id && (
                    <Link href={`/locations/${q.locations.id}`} className="text-sm text-primary hover:underline">
                      View branch
                    </Link>
                  )}
                  {q.notes && <p className="text-sm text-muted-foreground">{q.notes}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
