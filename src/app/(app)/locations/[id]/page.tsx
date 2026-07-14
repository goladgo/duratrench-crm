import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocationProfile } from "@/lib/queries/locations";
import { listProjectsForPicker } from "@/lib/queries/projects";
import { TERRITORY_LABELS } from "@/lib/territory";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { User } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContactFormDialog } from "@/components/contact-form-dialog";
import { ScanCardButton } from "@/components/scan-card-button";
import { VisitNoteFormDialog } from "@/components/visit-note-form-dialog";
import { OpportunityFormDialog } from "@/components/opportunity-form-dialog";
import { DeleteButton } from "@/components/delete-button";
import { LunchLearnCard } from "@/components/lunch-learn-card";
import { deleteContact } from "@/lib/actions/contacts";
import { deleteVisitNote } from "@/lib/actions/visits";
import { deleteOpportunity } from "@/lib/actions/opportunities";
import { deleteLocation } from "@/lib/actions/locations";
import type { ActivityType, LocationStatus, OpportunityStage } from "@/lib/types";

const STATUS_VARIANT: Record<LocationStatus, "default" | "secondary" | "outline"> = {
  active: "default",
  prospect: "secondary",
  inactive: "outline",
};

const ACTIVITY_TYPE_LABEL: Record<ActivityType, string> = {
  visit: "Visit",
  call: "Call",
  email: "Email",
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

  const projects = await listProjectsForPicker();

  const contactsById = new Map(contacts.map((c) => [c.id, c]));
  const opportunitiesById = new Map(opportunities.map((o) => [o.id, o]));
  const defaultOpportunityKind = location.companies?.category && location.companies.category !== "distributor" ? "spec" : "quote";
  const isDesignFirm = !!location.companies?.category && location.companies.category !== "distributor";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={STATUS_VARIANT[location.status]}>{location.status}</Badge>
            <Badge variant="outline">{TERRITORY_LABELS[location.territory_region]}</Badge>
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
        <DeleteButton
          action={deleteLocation}
          args={[location.id, location.company_id]}
          variant="outline"
          size="sm"
          label="Delete Location"
          confirmMessage={`Delete "${location.name}"? This also deletes its ${contacts.length} contact(s), ${visitNotes.length} logged activit${visitNotes.length === 1 ? "y" : "ies"}, and ${opportunities.length} quote(s)/spec(s). This can't be undone.`}
        />
      </div>

      {isDesignFirm && (
        <LunchLearnCard
          locationId={location.id}
          completedAt={location.lunch_learn_completed_at}
          scheduledAt={location.lunch_learn_scheduled_at}
        />
      )}

      <Tabs defaultValue="contacts">
        <TabsList>
          <TabsTrigger value="contacts">Contacts ({contacts.length})</TabsTrigger>
          <TabsTrigger value="visits">Activity ({visitNotes.length})</TabsTrigger>
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
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-muted-foreground">
                      {c.phone && <p>{c.phone}</p>}
                      {c.email && <p>{c.email}</p>}
                    </div>
                    <ContactFormDialog locationId={location.id} contact={c} />
                    <DeleteButton
                      action={deleteContact}
                      args={[c.id, location.id]}
                      confirmMessage={`Delete contact "${c.name}"?`}
                    />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="visits" className="space-y-3 pt-4">
          <div className="flex justify-end">
            <VisitNoteFormDialog locationId={location.id} contacts={contacts} opportunities={opportunities} />
          </div>
          {visitNotes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity logged yet.</p>
          ) : (
            visitNotes.map((v) => {
              const linkedOpportunity = v.opportunity_id ? opportunitiesById.get(v.opportunity_id) : undefined;
              return (
                <Card key={v.id}>
                  <CardContent className="space-y-1 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{ACTIVITY_TYPE_LABEL[v.activity_type]}</Badge>
                        <p className="text-sm font-medium">{v.visit_date}</p>
                        {v.follow_up_date && <Badge variant="outline">Follow up {v.follow_up_date}</Badge>}
                      </div>
                      <div className="flex items-center gap-1">
                        <VisitNoteFormDialog
                          locationId={location.id}
                          contacts={contacts}
                          opportunities={opportunities}
                          visitNote={v}
                        />
                        <DeleteButton
                          action={deleteVisitNote}
                          args={[v.id, location.id]}
                          confirmMessage={`Delete this ${ACTIVITY_TYPE_LABEL[v.activity_type].toLowerCase()} log from ${v.visit_date}?`}
                        />
                      </div>
                    </div>
                    {linkedOpportunity && (
                      <p className="text-sm text-muted-foreground">Re: {linkedOpportunity.title}</p>
                    )}
                    <p className="text-sm text-muted-foreground">{v.notes}</p>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="opportunities" className="space-y-3 pt-4">
          <div className="flex justify-end">
            <OpportunityFormDialog
              locationId={location.id}
              contacts={contacts}
              defaultKind={defaultOpportunityKind}
              projects={projects}
            />
          </div>
          {opportunities.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing logged yet.</p>
          ) : (
            opportunities.map((o) => {
              const contact = o.contact_id ? contactsById.get(o.contact_id) : undefined;
              return (
                <Card key={o.id}>
                  <CardContent className="space-y-1 py-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{o.title}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant={STAGE_VARIANT[o.stage]}>{o.stage}</Badge>
                        <OpportunityFormDialog
                          locationId={location.id}
                          contacts={contacts}
                          defaultKind={defaultOpportunityKind}
                          opportunity={o}
                          projects={projects}
                        />
                        <DeleteButton
                          action={deleteOpportunity}
                          args={[o.id, location.id, location.company_id]}
                          confirmMessage={`Delete "${o.title}"?`}
                        />
                      </div>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{o.product_line}</span>
                      <span>{formatMoney(o.amount)}</span>
                    </div>
                    {contact && (
                      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <User className="size-3.5 shrink-0" />
                        {contact.name}
                      </p>
                    )}
                    {o.project_id && (
                      <Link href={`/projects/${o.project_id}`} className="text-sm text-primary hover:underline">
                        View project
                      </Link>
                    )}
                    {o.notes && <p className="text-sm text-muted-foreground">{o.notes}</p>}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
