import Link from "next/link";
import { listLocations } from "@/lib/queries/locations";
import { listAllCompaniesForPicker } from "@/lib/queries/companies";
import { LocationFormDialog } from "@/components/location-form-dialog";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, CheckCircle2 } from "lucide-react";

export default async function NewVisitPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; logged?: string }>;
}) {
  const params = await searchParams;

  const [locations, companies] = await Promise.all([
    listLocations({ search: params.q }),
    listAllCompaniesForPicker(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Log a Visit</h1>
        <p className="text-muted-foreground">Where did you just stop?</p>
      </div>

      {params.logged === "1" && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
          <CheckCircle2 className="size-4" />
          Visit saved. Ready for the next stop.
        </div>
      )}

      <form action="/visits/new" className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" placeholder="Search locations..." defaultValue={params.q} className="pl-8" autoFocus />
        </div>
      </form>

      <div className="flex justify-center">
        <LocationFormDialog
          companies={companies}
          triggerLabel="This is a new stop"
          redirectTo="/visits/log/:id"
        />
      </div>

      <div className="space-y-3">
        {locations.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">No matches. Add it as a new stop above.</p>
        ) : (
          locations.map((loc) => (
            <Link key={loc.id} href={`/visits/log/${loc.id}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardHeader className="flex-row items-center justify-between space-y-0 py-3">
                  <div>
                    <CardTitle className="text-base">{loc.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {loc.companies?.name ?? "Independent"}
                      {loc.city ? ` · ${loc.city}, ${loc.state}` : ""}
                    </p>
                  </div>
                  <Badge variant="outline">{loc.territory_region === "socal" ? "SoCal" : "Las Vegas"}</Badge>
                </CardHeader>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
