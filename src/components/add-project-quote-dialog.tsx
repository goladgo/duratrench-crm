"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle } from "lucide-react";
import { createQuoteForProject, getLocationContacts } from "@/lib/actions/project-quotes";
import type { FormState } from "@/lib/actions/opportunities";
import { findContactByName, suggestContacts, type ContactLite } from "@/lib/quotes/contact-match";
import { normalizePersonName } from "@/lib/quotes/contact-match";
import type { QuoteContact, QuoteLocation } from "@/lib/queries/quote-locations";

const initialState: FormState = {};

function branchLabel(l: QuoteLocation): string {
  const company = l.companyName ?? "";
  const base = company && !l.name.toLowerCase().includes(company.toLowerCase()) ? `${company} – ${l.name}` : l.name;
  return l.city ? `${base} (${l.city})` : base;
}

export function AddProjectQuoteDialog({
  project,
  locations,
  contacts: allContacts,
  defaultAmount = null,
}: {
  project: { id: string; name: string };
  locations: QuoteLocation[];
  contacts: QuoteContact[];
  // Prefills the amount (the ODIS price) so it doesn't have to be typed again.
  defaultAmount?: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [branch, setBranch] = useState<QuoteLocation | null>(null);
  const [branchQuery, setBranchQuery] = useState("");
  const [contacts, setContacts] = useState<ContactLite[]>([]);
  const [personName, setPersonName] = useState("");
  const [loadingContacts, startLoadContacts] = useTransition();

  function resetForm() {
    setBranch(null);
    setBranchQuery("");
    setContacts([]);
    setPersonName("");
  }

  const [state, formAction, pending] = useActionState(async (prev: FormState, formData: FormData) => {
    const result = await createQuoteForProject(prev, formData);
    if (result.success) {
      setOpen(false);
      resetForm();
    }
    return result;
  }, initialState);

  function chooseBranch(l: QuoteLocation, presetPerson = "") {
    setBranch(l);
    setBranchQuery("");
    setPersonName(presetPerson);
    setContacts([]);
    startLoadContacts(async () => {
      setContacts(await getLocationContacts(l.id));
    });
  }

  const branchMatches = useMemo(() => {
    const q = branchQuery.trim().toLowerCase();
    if (!q) return [];
    return locations
      .filter((l) => `${l.companyName ?? ""} ${l.name} ${l.city ?? ""}`.toLowerCase().includes(q))
      .slice(0, 6);
  }, [branchQuery, locations]);

  // People who already exist, searchable across every branch. Picking one fills in their branch.
  const locationsById = useMemo(() => new Map(locations.map((l) => [l.id, l])), [locations]);
  const peopleMatches = useMemo(() => {
    const q = normalizePersonName(branchQuery);
    if (q.length < 2) return [];
    return allContacts
      .filter((c) => locationsById.has(c.locationId) && normalizePersonName(c.name).includes(q))
      .slice(0, 6);
  }, [branchQuery, allContacts, locationsById]);

  const matchedContact = findContactByName(contacts, personName);
  const isNewPerson = personName.trim() !== "" && !matchedContact && branch !== null;
  const chips = suggestContacts(contacts, personName).filter((c) => c.id !== matchedContact?.id);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <PlusCircle className="size-4" />
        Add quote
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add quote: {project.name}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="project_id" value={project.id} />
          <input type="hidden" name="location_id" value={branch?.id ?? ""} />

          <div className="space-y-2">
            <Label htmlFor="quote-branch">Who quoted it? Search a person or a branch</Label>
            {branch ? (
              <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                <span className="text-sm font-medium">{branchLabel(branch)}</span>
                <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
                  Change
                </Button>
              </div>
            ) : (
              <>
                <Input
                  id="quote-branch"
                  value={branchQuery}
                  onChange={(e: { target: { value: string } }) => setBranchQuery(e.target.value)}
                  placeholder="John Smith, Ferguson, Core & Main Torrance…"
                  autoComplete="off"
                />
                {(peopleMatches.length > 0 || branchMatches.length > 0) && (
                  <ul className="divide-y rounded-md border">
                    {peopleMatches.map((c) => {
                      const l = locationsById.get(c.locationId)!;
                      return (
                        <li key={c.id}>
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                            onClick={() => chooseBranch(l, c.name)}
                          >
                            <span className="font-medium">{c.name}</span>
                            <span className="text-muted-foreground"> · {branchLabel(l)}</span>
                          </button>
                        </li>
                      );
                    })}
                    {branchMatches.map((l) => (
                      <li key={l.id}>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                          onClick={() => chooseBranch(l)}
                        >
                          {branchLabel(l)}
                          <span className="text-muted-foreground"> · branch</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {branchQuery.trim() !== "" && peopleMatches.length === 0 && branchMatches.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No person or branch found. For a brand-new person, search for their branch and type their name
                    next. If the branch isn&apos;t in the CRM, add it from the Distributors tab first.
                  </p>
                )}
              </>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="quote-person">Person quoting</Label>
            <Input
              id="quote-person"
              name="contact_name"
              value={personName}
              onChange={(e: { target: { value: string } }) => setPersonName(e.target.value)}
              placeholder={branch ? "Type a name. New people are added automatically" : "Pick a branch first"}
              disabled={!branch}
              autoComplete="off"
            />
            {branch && loadingContacts && <p className="text-xs text-muted-foreground">Loading contacts…</p>}
            {branch && chips.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {chips.map((c) => (
                  <Button key={c.id} type="button" variant="outline" size="sm" onClick={() => setPersonName(c.name)}>
                    {c.name}
                  </Button>
                ))}
              </div>
            )}
            {matchedContact && <Badge variant="secondary">Existing contact</Badge>}
            {isNewPerson && (
              <div className="space-y-2 rounded-md border p-3">
                <Badge variant="secondary">New contact at this branch</Badge>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="quote-phone">Phone (optional)</Label>
                    <Input id="quote-phone" name="contact_phone" type="tel" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="quote-email">Email (optional)</Label>
                    <Input id="quote-email" name="contact_email" type="email" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="quote-product">Product line</Label>
              <Input id="quote-product" name="product_line" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quote-amount">Amount ($)</Label>
              <Input id="quote-amount" name="amount" type="number" step="0.01" min="0" defaultValue={defaultAmount ?? undefined} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quote-stage">Stage</Label>
            <Select name="stage" defaultValue="quoted">
              <SelectTrigger id="quote-stage" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quoted">Quoted</SelectItem>
                <SelectItem value="negotiating">Negotiating</SelectItem>
                <SelectItem value="won">Won</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quote-notes">Notes</Label>
            <Textarea id="quote-notes" name="notes" rows={2} />
          </div>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending || !branch}>
              {pending ? "Saving..." : isNewPerson ? "Save quote and add contact" : "Save quote"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
