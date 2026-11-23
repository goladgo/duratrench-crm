import Link from "next/link";
import {
  listContactsDirectory,
  listAllDesignFirmsAcrossReps,
  type DirectoryEntry,
} from "@/lib/queries/companies";
import { createClient } from "@/lib/supabase/server";
import { getRepLabel } from "@/lib/reps";
import { CompanyFormDialog } from "@/components/company-form-dialog";
import { SmartScanButton } from "@/components/smart-scan-button";
import { CheckboxFilter } from "@/components/checkbox-filter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MapPin, Search, User, Utensils } from "lucide-react";
import type { CompanyCategory } from "@/lib/types";

type ContactType = "firms" | "contractors";

const CATEGORY_LABELS: Record<string, string> = {
  civil_engineering: "Civil Engineering",
  landscape_architecture: "Landscape Architecture",
  contractor: "Contractor",
};

const isFirm = (category: CompanyCategory) =>
  category === "civil_engineering" || category === "landscape_architecture";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; q?: string; allReps?: string }>;
}) {
  const params = await searchParams;
  const type: ContactType | undefined =
    params.type === "firms" || params.type === "contractors" ? params.type : undefined;
  const q = params.q?.trim() || undefined;
  const showAllReps = params.allReps === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Search first (so the filter counts reflect it), then narrow by type in memory.
  const [searched, allRepsRows] = await Promise.all([
    showAllReps ? Promise.resolve([] as DirectoryEntry[]) : listContactsDirectory(q),
    showAllReps ? listAllDesignFirmsAcrossReps() : Promise.resolve([]),
  ]);

  const firmCount = searched.filter((e) => isFirm(e.company.category)).length;
  const contractorCount = searched.length - firmCount;
  const rows = searched.filter((e) =>
    type === "firms" ? isFirm(e.company.category) : type === "contractors" ? !isFirm(e.company.category) : true
  );

  // The cross-rep RPC has no search params (small whole-table read, see migration 0014),
  // so it's filtered by name here. It only ever covers design firms by design.
  const filteredAllReps = allRepsRows.filter(
    (r) => !q || r.companyName.toLowerCase().includes(q.toLowerCase())
  );

  const filterLink = (next: { type?: ContactType }) => {
    const usp = new URLSearchParams();
    if (next.type) usp.set("type", next.type);
    if (q) usp.set("q", q);
    if (showAllReps) usp.set("allReps", "1");
    const qs = usp.toString();
    return qs ? `/contacts?${qs}` : "/contacts";
  };

  const addCategories: CompanyCategory[] =
    type === "contractors"
      ? ["contractor"]
      : type === "firms"
        ? ["civil_engineering", "landscape_architecture"]
        : ["civil_engineering", "landscape_architecture", "contractor"];
  const scanDefault: CompanyCategory = type === "contractors" ? "contractor" : "civil_engineering";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Contacts</h1>
          <p className="text-muted-foreground">Design firms &amp; contractors</p>
        </div>
        <CompanyFormDialog
          categories={addCategories}
          triggerLabel={type === "contractors" ? "Add Contractor" : type === "firms" ? "Add Firm" : "Add Contact"}
        />
      </div>

      <SmartScanButton defaultCategory={scanDefault} triggerLabel="Scan a Business Card" />

      <form action="/contacts" className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {type && <input type="hidden" name="type" value={type} />}
        {showAllReps && <input type="hidden" name="allReps" value="1" />}
        <div className="relative flex-1 min-w-[16rem] max-w-md">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            placeholder="Search firms, branches, or people..."
            defaultValue={params.q}
            className="pl-8"
          />
        </div>
        {type !== "contractors" && <CheckboxFilter paramName="allReps" label="Show all reps' firms" />}
      </form>

      <div className="flex flex-wrap gap-2 text-sm">
        <Link href={filterLink({ type: undefined })}>
          <Badge variant={!type ? "default" : "outline"}>
            All{!showAllReps ? ` (${searched.length})` : ""}
          </Badge>
        </Link>
        <Link href={filterLink({ type: "firms" })}>
          <Badge variant={type === "firms" ? "default" : "outline"}>
            Design Firms{!showAllReps ? ` (${firmCount})` : ""}
          </Badge>
        </Link>
        <Link href={filterLink({ type: "contractors" })}>
          <Badge variant={type === "contractors" ? "default" : "outline"}>
            Contractors{!showAllReps ? ` (${contractorCount})` : ""}
          </Badge>
        </Link>
      </div>

      {showAllReps ? (
        type === "contractors" ? (
          <p className="text-muted-foreground">Other reps&apos; data is only shared for design firms.</p>
        ) : filteredAllReps.length === 0 ? (
          <p className="text-muted-foreground">No firms found across reps yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAllReps.map((f) => (
              <Link key={f.companyId} href={`/companies/${f.companyId}`}>
                <Card className="h-full transition-colors hover:bg-muted/50">
                  <CardHeader className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="secondary" className="w-fit">
                        {CATEGORY_LABELS[f.category]}
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
        <p className="text-muted-foreground">
          {q ? "No firms, branches, or people match that search." : "No contacts yet. Add a design firm or contractor."}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(({ company, rollup, lunchLearn, matchedLocations, matchedContacts }) => (
            <Card key={company.id} className="relative h-full transition-colors hover:bg-muted/50">
              <CardHeader className="space-y-1.5">
                <Badge variant="secondary" className="w-fit">
                  {CATEGORY_LABELS[company.category]}
                </Badge>
                <CardTitle className="text-base">
                  {/* Stretched link: the whole card opens the company, while the matched
                      branch/person links below sit above it (relative z-10). */}
                  <Link href={`/companies/${company.id}`} className="after:absolute after:inset-0">
                    {company.name}
                  </Link>
                </CardTitle>
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
                {(matchedLocations.length > 0 || matchedContacts.length > 0) && (
                  <ul className="space-y-1 border-t pt-2 text-foreground">
                    {matchedLocations.slice(0, 3).map((l) => (
                      <li key={l.id}>
                        <Link
                          href={`/locations/${l.id}`}
                          className="relative z-10 flex items-center gap-1.5 hover:underline"
                        >
                          <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
                          <span className="truncate">{[l.name, l.city].filter(Boolean).join(" — ")}</span>
                        </Link>
                      </li>
                    ))}
                    {matchedContacts.slice(0, 3).map((c) => (
                      <li key={c.id}>
                        <Link
                          href={`/locations/${c.location_id}`}
                          className="relative z-10 flex items-center gap-1.5 hover:underline"
                        >
                          <User className="size-3.5 shrink-0 text-muted-foreground" />
                          <span className="truncate">
                            {c.name}
                            {c.title ? `, ${c.title}` : ""}
                            {c.locationLabel ? ` (${c.locationLabel})` : ""}
                          </span>
                        </Link>
                      </li>
                    ))}
                    {matchedLocations.length > 3 || matchedContacts.length > 3 ? (
                      <li className="text-muted-foreground">+ more matches inside</li>
                    ) : null}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
