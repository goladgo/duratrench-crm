import Link from "next/link";
import { listCompanies, listAllDesignFirmsAcrossReps } from "@/lib/queries/companies";
import { createClient } from "@/lib/supabase/server";
import { getRepLabel } from "@/lib/reps";
import { CompanyFormDialog } from "@/components/company-form-dialog";
import { SmartScanButton } from "@/components/smart-scan-button";
import { CheckboxFilter } from "@/components/checkbox-filter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Utensils } from "lucide-react";
import type { CompanyCategory } from "@/lib/types";

const CATEGORY_LABELS = {
  civil_engineering: "Civil Engineering",
  landscape_architecture: "Landscape Architecture",
} as const;

const FIRM_CATEGORIES: CompanyCategory[] = ["civil_engineering", "landscape_architecture"];

export default async function FirmsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; q?: string; allReps?: string }>;
}) {
  const params = await searchParams;
  const type = params.type as CompanyCategory | undefined;
  const categories: CompanyCategory[] = type && FIRM_CATEGORIES.includes(type) ? [type] : FIRM_CATEGORIES;
  const showAllReps = params.allReps === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [rows, allRepsRows] = await Promise.all([
    showAllReps ? Promise.resolve([]) : listCompanies(categories, params.q),
    showAllReps ? listAllDesignFirmsAcrossReps() : Promise.resolve([]),
  ]);

  // The cross-rep RPC has no category/search params (it's a small, whole-table read --
  // see migration 0014) -- filter client-side here instead of round-tripping again.
  const filteredAllReps = allRepsRows
    .filter((r) => categories.includes(r.category))
    .filter((r) => !params.q || r.companyName.toLowerCase().includes(params.q.toLowerCase()));

  const filterLink = (next: Partial<{ type?: string; q?: string; allReps?: string }>) => {
    const merged = { ...params, ...next };
    const usp = new URLSearchParams();
    if (merged.type) usp.set("type", merged.type);
    if (merged.q) usp.set("q", merged.q);
    if (merged.allReps) usp.set("allReps", merged.allReps);
    const qs = usp.toString();
    return qs ? `/firms?${qs}` : "/firms";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Design Firms</h1>
          <p className="text-muted-foreground">Civil engineers &amp; landscape architects</p>
        </div>
        <CompanyFormDialog categories={FIRM_CATEGORIES} triggerLabel="Add Firm" />
      </div>

      <SmartScanButton defaultCategory="civil_engineering" triggerLabel="Scan a Firm's Business Card" />

      <form action="/firms" className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {type && <input type="hidden" name="type" value={type} />}
        {showAllReps && <input type="hidden" name="allReps" value="1" />}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" placeholder="Search by name..." defaultValue={params.q} className="pl-8" />
        </div>
        <CheckboxFilter paramName="allReps" label="Show all reps' firms" />
      </form>

      <div className="flex flex-wrap gap-2 text-sm">
        <Link href={filterLink({ type: undefined })}>
          <Badge variant={!type ? "default" : "outline"}>All</Badge>
        </Link>
        <Link href={filterLink({ type: "civil_engineering" })}>
          <Badge variant={type === "civil_engineering" ? "default" : "outline"}>Civil Engineering</Badge>
        </Link>
        <Link href={filterLink({ type: "landscape_architecture" })}>
          <Badge variant={type === "landscape_architecture" ? "default" : "outline"}>Landscape Architecture</Badge>
        </Link>
      </div>

      {showAllReps ? (
        filteredAllReps.length === 0 ? (
          <p className="text-muted-foreground">No firms found across reps yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAllReps.map((f) => (
              <Link key={f.companyId} href={`/companies/${f.companyId}`}>
                <Card className="h-full transition-colors hover:bg-muted/50">
                  <CardHeader className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="secondary" className="w-fit">
                        {CATEGORY_LABELS[f.category as keyof typeof CATEGORY_LABELS]}
                      </Badge>
                      <Badge variant={f.repId === user?.id ? "default" : "outline"}>
                        {f.repId === user?.id ? "You" : getRepLabel(f.repEmail)}
                      </Badge>
                    </div>
                    <CardTitle className="text-base">{f.companyName}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Offices</span>
                      <span>{f.locationCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Contacts</span>
                      <span>{f.contactCount}</span>
                    </div>
                    {f.lastVisitDate && <p>Last visit {f.lastVisitDate}</p>}
                    {f.lunchLearnCompletedAt && (
                      <p className="flex items-center gap-1.5 text-foreground">
                        <Utensils className="size-3.5 shrink-0 text-primary" />
                        Lunch &amp; Learn completed {f.lunchLearnCompletedAt}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground">No firms yet. Add a civil engineering or landscape architecture firm.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(({ company, rollup, lunchLearn }) => (
            <Link key={company.id} href={`/companies/${company.id}`}>
              <Card className="h-full transition-colors hover:bg-muted/50">
                <CardHeader className="space-y-1.5">
                  <Badge variant="secondary" className="w-fit">
                    {CATEGORY_LABELS[company.category as keyof typeof CATEGORY_LABELS]}
                  </Badge>
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
