import Link from "next/link";
import { listLocations } from "@/lib/queries/locations";
import { listAllCompaniesForPicker } from "@/lib/queries/companies";
import { LocationFormDialog } from "@/components/location-form-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import type { LocationStatus, TerritoryRegion } from "@/lib/types";

const STATUS_VARIANT: Record<LocationStatus, "default" | "secondary" | "outline"> = {
  active: "default",
  prospect: "secondary",
  inactive: "outline",
};

export default async function LocationsPage({
  searchParams,
}: {
  searchParams: Promise<{ region?: string; status?: string; q?: string }>;
}) {
  const params = await searchParams;
  const region = (params.region as TerritoryRegion) || undefined;
  const status = (params.status as LocationStatus) || undefined;

  const [locations, companies] = await Promise.all([
    listLocations({ region, status, search: params.q }),
    listAllCompaniesForPicker(),
  ]);

  const filterLink = (next: Partial<{ region?: string; status?: string; q?: string }>) => {
    const merged = { ...params, ...next };
    const usp = new URLSearchParams();
    if (merged.region) usp.set("region", merged.region);
    if (merged.status) usp.set("status", merged.status);
    if (merged.q) usp.set("q", merged.q);
    const qs = usp.toString();
    return qs ? `/locations?${qs}` : "/locations";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Locations</h1>
          <p className="text-muted-foreground">Distributor branches you visit</p>
        </div>
        <LocationFormDialog companies={companies} />
      </div>

      <form action="/locations" className="flex gap-2">
        {region && <input type="hidden" name="region" value={region} />}
        {status && <input type="hidden" name="status" value={status} />}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" placeholder="Search by name..." defaultValue={params.q} className="pl-8" />
        </div>
      </form>

      <div className="flex flex-wrap gap-2 text-sm">
        <Link href={filterLink({ region: undefined })}>
          <Badge variant={!region ? "default" : "outline"}>All regions</Badge>
        </Link>
        <Link href={filterLink({ region: "socal" })}>
          <Badge variant={region === "socal" ? "default" : "outline"}>SoCal</Badge>
        </Link>
        <Link href={filterLink({ region: "vegas" })}>
          <Badge variant={region === "vegas" ? "default" : "outline"}>Las Vegas</Badge>
        </Link>
        <span className="mx-1 text-muted-foreground">|</span>
        <Link href={filterLink({ status: undefined })}>
          <Badge variant={!status ? "default" : "outline"}>All statuses</Badge>
        </Link>
        <Link href={filterLink({ status: "prospect" })}>
          <Badge variant={status === "prospect" ? "default" : "outline"}>Prospect</Badge>
        </Link>
        <Link href={filterLink({ status: "active" })}>
          <Badge variant={status === "active" ? "default" : "outline"}>Active</Badge>
        </Link>
        <Link href={filterLink({ status: "inactive" })}>
          <Badge variant={status === "inactive" ? "default" : "outline"}>Inactive</Badge>
        </Link>
      </div>

      {locations.length === 0 ? (
        <p className="text-muted-foreground">No locations match these filters yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                <CardContent className="space-y-1 text-sm text-muted-foreground">
                  {loc.companies?.name && <p>{loc.companies.name}</p>}
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
  );
}
