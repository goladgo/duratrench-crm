import Link from "next/link";
import { notFound } from "next/navigation";
import { getCompany } from "@/lib/queries/companies";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LocationFormDialog } from "@/components/location-form-dialog";
import type { LocationStatus } from "@/lib/types";

const CATEGORY_LABELS = {
  distributor: "Distributor",
  civil_engineering: "Civil Engineering",
  landscape_architecture: "Landscape Architecture",
} as const;

const STATUS_VARIANT: Record<LocationStatus, "default" | "secondary" | "outline"> = {
  active: "default",
  prospect: "secondary",
  inactive: "outline",
};

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

  const { company, rollup, locations } = data;
  if (!company) notFound();

  return (
    <div className="space-y-6">
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
            {locations.map((loc) => (
              <Link key={loc.id} href={`/locations/${loc.id}`}>
                <Card className="h-full transition-colors hover:bg-muted/50">
                  <CardHeader className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Badge variant={STATUS_VARIANT[loc.status]}>{loc.status}</Badge>
                      <Badge variant="outline">{loc.territory_region === "socal" ? "SoCal" : "Las Vegas"}</Badge>
                    </div>
                    <CardTitle className="text-base">{loc.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {loc.city && (
                      <p>
                        {loc.city}, {loc.state}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
