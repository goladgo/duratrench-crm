"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
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
import { createVisitNote, updateVisitNote, type FormState } from "@/lib/actions/visits";
import { PlusCircle, Pencil } from "lucide-react";
import type { ActivityType, Contact, Opportunity, VisitNote } from "@/lib/types";

const initialState: FormState = {};

const ACTIVITY_TYPE_OPTIONS: { value: ActivityType; label: string }[] = [
  { value: "visit", label: "Visit" },
  { value: "call", label: "Call" },
  { value: "email", label: "Email" },
];

export function VisitNoteFormDialog({
  locationId,
  contacts,
  opportunities = [],
  visitNote,
}: {
  locationId: string;
  contacts: Contact[];
  opportunities?: Pick<Opportunity, "id" | "title" | "amount">[];
  visitNote?: VisitNote;
}) {
  const isEdit = !!visitNote;
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (prevState: FormState, formData: FormData) => {
    const result = isEdit ? await updateVisitNote(prevState, formData) : await createVisitNote(prevState, formData);
    if (result.success) setOpen(false);
    return result;
  }, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size={isEdit ? "icon-sm" : "sm"} variant={isEdit ? "ghost" : "outline"} />}>
        {isEdit ? (
          <Pencil className="size-4" />
        ) : (
          <>
            <PlusCircle className="size-4" />
            Log Activity
          </>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Activity" : "Log an Activity"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="location_id" value={locationId} />
          {isEdit && <input type="hidden" name="id" value={visitNote.id} />}
          <div className="space-y-2">
            <Label htmlFor="visit-type">Type</Label>
            <Select name="activity_type" defaultValue={visitNote?.activity_type ?? "visit"}>
              <SelectTrigger id="visit-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="visit-date">Date</Label>
              <Input
                id="visit-date"
                name="visit_date"
                type="date"
                defaultValue={visitNote?.visit_date ?? new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="visit-followup">Follow up</Label>
              <Input
                id="visit-followup"
                name="follow_up_date"
                type="date"
                defaultValue={visitNote?.follow_up_date ?? undefined}
              />
            </div>
          </div>
          {contacts.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="visit-contact">Who you spoke with</Label>
              <Select name="contact_id" defaultValue={visitNote?.contact_id ?? undefined}>
                <SelectTrigger id="visit-contact" className="w-full">
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
              <Label htmlFor="visit-opportunity">Following up on a quote? (optional)</Label>
              <Select name="opportunity_id" defaultValue={visitNote?.opportunity_id ?? undefined}>
                <SelectTrigger id="visit-opportunity" className="w-full">
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
          <div className="space-y-2">
            <Label htmlFor="visit-notes">Notes</Label>
            <Textarea id="visit-notes" name="notes" rows={4} required autoFocus defaultValue={visitNote?.notes} />
          </div>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
