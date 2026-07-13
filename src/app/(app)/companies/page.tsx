import Link from "next/link";
import { listCompanies } from "@/lib/queries/companies";
import { CompanyFormDialog } from "@/components/company-form-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

function formatMoney(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const rows = await listCompanies(["distributor"], params.q);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Distributors</h1>
          <p className="text-muted-foreground">Distributor chains across your territory</p>
        </div>
        <CompanyFormDialog categories={["distributor"]} triggerLabel="Add Distributor" />
      </div>

      <form action="/companies" className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" placeholder="Search by name..." defaultValue={params.q} className="pl-8" />
        </div>
      </form>

      {rows.length === 0 ? (
        <p className="text-muted-foreground">
          No companies yet. Add Ferguson Waterworks, Core &amp; Main, Reece, WinWater, or an independent distributor.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(({ company, rollup }) => (
            <Link key={company.id} href={`/companies/${company.id}`}>
              <Card className="h-full transition-colors hover:bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-base">{company.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Locations</span>
                    <span>
                      {rollup?.active_location_count ?? 0} active / {rollup?.location_count ?? 0} total
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Open quotes</span>
                    <span>{formatMoney(rollup?.open_value ?? 0)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Won</span>
                    <span>{formatMoney(rollup?.won_value ?? 0)}</span>
                  </div>
                  {rollup?.last_visit_date && (
                    <Badge variant="secondary" className="mt-1">
                      Last visit {rollup.last_visit_date}
                    </Badge>
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
