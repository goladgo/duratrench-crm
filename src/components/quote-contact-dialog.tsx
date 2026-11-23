"use client";

import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, UserPlus } from "lucide-react";
import { getLocationContacts, setQuoteContact } from "@/lib/actions/project-quotes";
import type { FormState } from "@/lib/actions/opportunities";
import { findContactByName, suggestContacts, type ContactLite } from "@/lib/quotes/contact-match";

const initialState: FormState = {};

// "Who quoted this?" for a quote that already exists. Typing a name that isn't in the CRM creates
// the contact at the quote's branch in the same save, so a quote can go out first and the person
// can be attached afterwards, without a separate trip to the branch page.
export function QuoteContactDialog({
  opportunityId,
  locationId,
  branchLabel,
  currentName,
}: {
  opportunityId: string;
  locationId: string;
  branchLabel: string;
  currentName: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [contacts, setContacts] = useState<ContactLite[]>([]);
  const [personName, setPersonName] = useState(currentName ?? "");
  const [loading, startLoad] = useTransition();

  const [state, formAction, pending] = useActionState(async (prev: FormState, formData: FormData) => {
    const result = await setQuoteContact(prev, formData);
    if (result.success) setOpen(false);
    return result;
  }, initialState);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setPersonName(currentName ?? "");
      startLoad(async () => {
        setContacts(await getLocationContacts(locationId));
      });
    }
  }

  const matched = findContactByName(contacts, personName);
  const isNew = personName.trim() !== "" && !matched && !loading;
  const chips = suggestContacts(contacts, personName).filter((c) => c.id !== matched?.id);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button type="button" size="sm" variant={currentName ? "ghost" : "outline"} />}>
        {currentName ? (
          <>
            <Pencil className="size-3.5" />
            Change
          </>
        ) : (
          <>
            <UserPlus className="size-4" />
            Who quoted this?
          </>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Who quoted this?</DialogTitle>
          <DialogDescription>{branchLabel}</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="opportunity_id" value={opportunityId} />
          <div className="space-y-2">
            <Label htmlFor={`qc-name-${opportunityId}`}>Person quoting</Label>
            <Input
              id={`qc-name-${opportunityId}`}
              name="contact_name"
              value={personName}
              onChange={(e: { target: { value: string } }) => setPersonName(e.target.value)}
              placeholder="Type a name. New people are added automatically"
              autoComplete="off"
              autoFocus
              required
            />
            {loading && <p className="text-xs text-muted-foreground">Loading contacts…</p>}
            {chips.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {chips.map((c) => (
                  <Button key={c.id} type="button" variant="outline" size="sm" onClick={() => setPersonName(c.name)}>
                    {c.name}
                  </Button>
                ))}
              </div>
            )}
            {matched && <Badge variant="secondary">Existing contact</Badge>}
            {isNew && (
              <div className="space-y-2 rounded-md border p-3">
                <Badge variant="secondary">New contact at this branch</Badge>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor={`qc-phone-${opportunityId}`}>Phone (optional)</Label>
                    <Input id={`qc-phone-${opportunityId}`} name="contact_phone" type="tel" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`qc-email-${opportunityId}`}>Email (optional)</Label>
                    <Input id={`qc-email-${opportunityId}`} name="contact_email" type="email" />
                  </div>
                </div>
              </div>
            )}
          </div>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending || !personName.trim()}>
              {pending ? "Saving..." : isNew ? "Save and add contact" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
