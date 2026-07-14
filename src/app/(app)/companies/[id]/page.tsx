import Link from "next/link";
import { notFound } from "next/navigation";
import { getCompany } from "@/lib/queries/companies";
import { listProjectsBySpecifyingCompany } from "@/lib/queries/projects";
import { TERRITORY_LABELS } from "@/lib/territory";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LocationFormDialog } from "@/components/location-form-dialog";
import { DeleteButton } from "@/components/delete-button";
import { deleteCompany } from "@/lib/actions/companies";
import { Utensils } from "lucide-react";
import type { LocationStatus, ProjectStage } from "@/lib/types";

const CATEGORY_LABELS = {
  distributor: "Distributor",
  civil_engineering: "Civil Engineering",
  landscape_architecture: "Landscape Architecture",
  contractor: "Contractor",
} as const;

const STATUS_VARIANT: Record<LocationStatus, "default" | "secondary" | "outline"> = {
  active: "default",
  prospect: "secondary",
  inactive: "outline",
};

const PROJECT_STAGE_VARIANT: Record<ProjectStage, "default" | "secondary" | "destructive"> = {
  quoted: "secondary",
  won: "default",
  lost: "destructive",
};

const DESIGN_FIRM_CATEGORIES = ["civil_engineering", "landscape_architecture"];

function formatMoney(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default async function CompanyProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let data;
  try {
    data = await getCompany(id);
  } catch {
    notFound();
  }

  const { company, rollup, locations, locationStats } = data;
  if (!company) notFound();

  const oppNoun = company.category === "distributor" ? "Quote" : "Spec";
  const isDesignFirm = DESIGN_FIRM_CATEGORIES.includes(company.category);
  const specifiedProjects = isDesignFirm ? await listProjectsBySpecifyingCompany(company.id) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-2">
          <Badge variant="secondary">{CATEGORY_LABELS[company.category]}</Badge>
          <h1 className="text-2xl font-semibold">{company.name}</h1>
          {company.website && (
            <a href={company.website} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
              {company.website}
            </a>
          )}
          {company.notes && <p className="text-sm text-muted-foreground">{company.notes}</p>}
        </div>
        <DeleteButton
          action={deleteCompany}
          args={[company.id, company.category]}
          variant="outline"
          size="sm"
          label="Delete Company"
          confirmMessage={`Delete "${company.name}"? This also deletes its ${locations.length} location(s) and everything under them (contacts, visit notes, quotes/specs). This can't be undone.`}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Locations</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {rollup?.active_location_count ?? 0}
            <span className="text-sm font-normal text-muted-foreground"> / {rollup?.location_count ?? 0}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Contacts</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{rollup?.contact_count ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Open Value</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatMoney(rollup?.open_value ?? 0)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Won</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatMoney(rollup?.won_value ?? 0)}</CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Locations</h2>
          <LocationFormDialog presetCompanyId={company.id} triggerLabel="Add Location" />
        </div>
        {locations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No locations under this company yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {locations.map((loc) => {
              const stats = locationStats.get(loc.id);
              return (
                <Link key={loc.id} href={`/locations/${loc.id}`}>
                  <Card className="h-full transition-colors hover:bg-muted/50">
                    <CardHeader className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Badge variant={STATUS_VARIANT[loc.status]}>{loc.status}</Badge>
                        <Badge variant="outline">{TERRITORY_LABELS[loc.territory_region]}</Badge>
                      </div>
                      <CardTitle className="text-base">{loc.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm text-muted-foreground">
                      {loc.city && (
                        <p>
                          {loc.city}, {loc.state}
                        </p>
                      )}
                      {loc.lunch_learn_completed_at && (
                        <p className="flex items-center gap-1.5 text-foreground">
                          <Utensils className="size-3.5 shrink-0 text-primary" />
                          Lunch &amp; Learn completed {loc.lunch_learn_completed_at}
                        </p>
                      )}
                      {stats?.lastVisitDate && <p>Last visit {stats.lastVisitDate}</p>}
                      {stats && stats.opportunityCount > 0 && (
                        <p>
                          {stats.opportunityCount} {oppNoun}
                          {stats.opportunityCount === 1 ? "" : "s"} · {formatMoney(stats.opportunityTotal)}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {isDesignFirm && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium">Projects Specified</h2>
          {specifiedProjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No projects tracked yet — set this firm as the specifying firm on a project's page.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {specifiedProjects.map((p) => (
                <Link key={p.id} href={`/projects/${p.id}`}>
                  <Card className="h-full transition-colors hover:bg-muted/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                      <CardTitle className="text-base">{p.name}</CardTitle>
                      <Badge variant={PROJECT_STAGE_VARIANT[p.stage]}>{p.stage}</Badge>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
