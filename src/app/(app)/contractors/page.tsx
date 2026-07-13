import Link from "next/link";
import { listCompanies } from "@/lib/queries/companies";
import { CompanyFormDialog } from "@/components/company-form-dialog";
import { SmartScanButton } from "@/components/smart-scan-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Utensils } from "lucide-react";

export default async function ContractorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const rows = await listCompanies(["contractor"], params.q);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Contractors</h1>
          <p className="text-muted-foreground">General, asphalt &amp; concrete contractors</p>
        </div>
        <CompanyFormDialog categories={["contractor"]} triggerLabel="Add Contractor" />
      </div>

      <SmartScanButton defaultCategory="contractor" triggerLabel="Scan a Contractor's Business Card" />

      <form action="/contractors" className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" placeholder="Search by name..." defaultValue={params.q} className="pl-8" />
        </div>
      </form>

      {rows.length === 0 ? (
        <p className="text-muted-foreground">No contractors yet. Add one to get started.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(({ company, rollup, lunchLearn }) => (
            <Link key={company.id} href={`/companies/${company.id}`}>
              <Card className="h-full transition-colors hover:bg-muted/50">
                <CardHeader className="space-y-1.5">
                  <CardTitle className="text-base">{company.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Offices</span>
                    <span>{rollup?.location_count ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Contacts</span>
                    <span>{rollup?.contact_count ?? 0}</span>
                  </div>
                  {rollup?.last_visit_date && <p>Last visit {rollup.last_visit_date}</p>}
                  {lunchLearn.status === "completed" && (
                    <p className="flex items-center gap-1.5 text-foreground">
                      <Utensils className="size-3.5 shrink-0 text-primary" />
                      Lunch &amp; Learn completed {lunchLearn.date}
                      {lunchLearn.branchCity || lunchLearn.branchName
                        ? ` — ${lunchLearn.branchCity ?? lunchLearn.branchName}`
                        : ""}
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
