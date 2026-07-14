import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocationProfile } from "@/lib/queries/locations";
import { listProjectsForPicker } from "@/lib/queries/projects";
import { TERRITORY_LABELS } from "@/lib/territory";
import { logVisitAndReturn } from "@/lib/actions/visits";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ContactFormDialog } from "@/components/contact-form-dialog";
import { OpportunityFormDialog } from "@/components/opportunity-form-dialog";
import { ScanCardButton } from "@/components/scan-card-button";

export default async function LogVisitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let profile;
  try {
    profile = await getLocationProfile(id);
  } catch {
    notFound();
  }

  const { location, contacts, opportunities } = profile;
  if (!location) notFound();

  const projects = await listProjectsForPicker();
  const defaultOpportunityKind = location.companies?.category && location.companies.category !== "distributor" ? "spec" : "quote";

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{TERRITORY_LABELS[location.territory_region]}</Badge>
          {location.companies?.name && <Badge variant="secondary">{location.companies.name}</Badge>}
        </div>
        <h1 className="text-2xl font-semibold">{location.name}</h1>
        {(location.address || location.city) && (
          <p className="text-sm text-muted-foreground">
            {location.address ? `${location.address}, ` : ""}
            {location.city}
            {location.city && location.state ? `, ${location.state}` : location.state}
          </p>
        )}
        <Link href={`/locations/${location.id}`} className="text-sm text-primary hover:underline">
          View full profile
        </Link>
      </div>

      <form action={logVisitAndReturn} className="space-y-4">
        <input type="hidden" name="location_id" value={location.id} />

        <div className="space-y-2">
          <Label htmlFor="activity_type">Type</Label>
          <Select name="activity_type" defaultValue="visit">
            <SelectTrigger id="activity_type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="visit">Visit</SelectItem>
              <SelectItem value="call">Call</SelectItem>
              <SelectItem value="email">Email</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">What happened?</Label>
          <Textarea
            id="notes"
            name="notes"
            rows={6}
            required
            autoFocus
            placeholder="Talked to the counter guy about DuraTrench stock levels, dropped samples..."
          />
        </div>

        {contacts.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="contact_id">Who you spoke with</Label>
            <Select name="contact_id">
              <SelectTrigger id="contact_id" className="w-full">
                <SelectValue placeholder="Select a contact" />
              </SelectTrigger>
              <SelectContent>
                {contacts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {opportunities.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="opportunity_id">Following up on a quote? (optional)</Label>
            <Select name="opportunity_id">
              <SelectTrigger id="opportunity_id" className="w-full">
                <SelectValue placeholder="Not tied to a specific quote" />
              </SelectTrigger>
              <SelectContent>
                {opportunities.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.title}
                    {o.amount != null ? ` — $${o.amount.toLocaleString()}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="visit_date">Date</Label>
            <Input id="visit_date" name="visit_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="follow_up_date">Follow up</Label>
            <Input id="follow_up_date" name="follow_up_date" type="date" />
          </div>
        </div>

        <Button type="submit" size="lg" className="w-full">
          Save Activity
        </Button>
      </form>

      <div className="flex flex-wrap items-center justify-center gap-3 border-t pt-4">
        <ScanCardButton locationId={location.id} />
        <ContactFormDialog locationId={location.id} />
        <OpportunityFormDialog
          locationId={location.id}
          contacts={contacts}
          defaultKind={defaultOpportunityKind}
          projects={projects}
        />
      </div>
    </div>
  );
}
