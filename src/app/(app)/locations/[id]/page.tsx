import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocationProfile } from "@/lib/queries/locations";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContactFormDialog } from "@/components/contact-form-dialog";
import { ScanCardButton } from "@/components/scan-card-button";
import { VisitNoteFormDialog } from "@/components/visit-note-form-dialog";
import { OpportunityFormDialog } from "@/components/opportunity-form-dialog";
import type { LocationStatus, OpportunityStage } from "@/lib/types";

const STATUS_VARIANT: Record<LocationStatus, "default" | "secondary" | "outline"> = {
  active: "default",
  prospect: "secondary",
  inactive: "outline",
};

const STAGE_VARIANT: Record<OpportunityStage, "default" | "secondary" | "outline" | "destructive"> = {
  quoted: "secondary",
  negotiating: "default",
  won: "default",
  lost: "destructive",
};

function formatMoney(value: number | null) {
  if (value == null) return null;
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default async function LocationProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let profile;
  try {
    profile = await getLocationProfile(id);
  } catch {
    notFound();
  }

  const { location, contacts, visitNotes, opportunities } = profile;
  if (!location) notFound();

  const defaultOpportunityKind = location.companies?.category && location.companies.category !== "distributor" ? "spec" : "quote";

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={STATUS_VARIANT[location.status]}>{location.status}</Badge>
          <Badge variant="outline">{location.territory_region === "socal" ? "SoCal" : "Las Vegas"}</Badge>
          {location.distributor_type && <Badge variant="outline">{location.distributor_type}</Badge>}
        </div>
        <h1 className="text-2xl font-semibold">{location.name}</h1>
        {location.companies && (
          <Link href={`/companies/${location.companies.id}`} className="text-sm text-primary hover:underline">
            {location.companies.name}
          </Link>
        )}
        {(location.address || location.city) && (
          <p className="text-sm text-muted-foreground">
            {location.address ? `${location.address}, ` : ""}
            {location.city}
            {location.city && location.state ? `, ${location.state}` : location.state}
            {location.zip ? ` ${location.zip}` : ""}
          </p>
        )}
      </div>

      <Tabs defaultValue="contacts">
        <TabsList>
          <TabsTrigger value="contacts">Contacts ({contacts.length})</TabsTrigger>
          <TabsTrigger value="visits">Visit Notes ({visitNotes.length})</TabsTrigger>
          <TabsTrigger value="opportunities">
            {defaultOpportunityKind === "quote" ? "Quotes" : "Specs"} ({opportunities.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contacts" className="space-y-3 pt-4">
          <div className="flex justify-end gap-2">
            <ScanCardButton locationId={location.id} />
            <ContactFormDialog locationId={location.id} />
          </div>
          {contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No contacts yet.</p>
          ) : (
            contacts.map((c) => (
              <Card key={c.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-2 py-4">
                  <div>
                    <p className="font-medium">
                      {c.name} {c.is_primary && <Badge className="ml-1 align-middle">Primary</Badge>}
                    </p>
                    <p className="text-sm text-muted-foreground">{c.title}</p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {c.phone && <p>{c.phone}</p>}
                    {c.email && <p>{c.email}</p>}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="visits" className="space-y-3 pt-4">
          <div className="flex justify-end">
            <VisitNoteFormDialog locationId={location.id} contacts={contacts} />
          </div>
          {visitNotes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No visit notes yet.</p>
          ) : (
            visitNotes.map((v) => (
              <Card key={v.id}>
                <CardContent className="space-y-1 py-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{v.visit_date}</p>
                    {v.follow_up_date && <Badge variant="outline">Follow up {v.follow_up_date}</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{v.notes}</p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="opportunities" className="space-y-3 pt-4">
          <div className="flex justify-end">
            <OpportunityFormDialog locationId={location.id} contacts={contacts} defaultKind={defaultOpportunityKind} />
          </div>
          {opportunities.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing logged yet.</p>
          ) : (
            opportunities.map((o) => (
              <Card key={o.id}>
                <CardContent className="space-y-1 py-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{o.title}</p>
                    <Badge variant={STAGE_VARIANT[o.stage]}>{o.stage}</Badge>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{o.product_line}</span>
                    <span>{formatMoney(o.amount)}</span>
                  </div>
                  {o.notes && <p className="text-sm text-muted-foreground">{o.notes}</p>}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
