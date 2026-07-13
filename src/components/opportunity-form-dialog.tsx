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
import { createOpportunity, updateOpportunity, type FormState } from "@/lib/actions/opportunities";
import { PlusCircle, Pencil } from "lucide-react";
import type { Contact, Opportunity, OpportunityKind } from "@/lib/types";

const initialState: FormState = {};

export function OpportunityFormDialog({
  locationId,
  contacts,
  defaultKind,
  opportunity,
}: {
  locationId: string;
  contacts: Contact[];
  defaultKind: OpportunityKind;
  opportunity?: Opportunity;
}) {
  const isEdit = !!opportunity;
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (prevState: FormState, formData: FormData) => {
    const result = isEdit ? await updateOpportunity(prevState, formData) : await createOpportunity(prevState, formData);
    if (result.success) setOpen(false);
    return result;
  }, initialState);

  const kind = opportunity?.kind ?? defaultKind;
  const noun = kind === "quote" ? "Quote" : "Spec";
  const label = isEdit ? `Edit ${noun}` : `Add ${noun}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size={isEdit ? "icon-sm" : "sm"} variant={isEdit ? "ghost" : "outline"} />}>
        {isEdit ? (
          <Pencil className="size-4" />
        ) : (
          <>
            <PlusCircle className="size-4" />
            {label}
          </>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="location_id" value={locationId} />
          <input type="hidden" name="kind" value={kind} />
          {isEdit && <input type="hidden" name="id" value={opportunity.id} />}
          <div className="space-y-2">
            <Label htmlFor="opp-title">Title</Label>
            <Input
              id="opp-title"
              name="title"
              required
              placeholder="e.g. 500ft DuraTrench - Main St project"
              defaultValue={opportunity?.title}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="opp-product">Product line</Label>
              <Input id="opp-product" name="product_line" defaultValue={opportunity?.product_line ?? undefined} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="opp-amount">Amount ($)</Label>
              <Input
                id="opp-amount"
                name="amount"
                type="number"
                step="0.01"
                min="0"
                defaultValue={opportunity?.amount ?? undefined}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="opp-stage">Stage</Label>
            <Select name="stage" defaultValue={opportunity?.stage ?? "quoted"}>
              <SelectTrigger id="opp-stage" className="w-full">
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
          {contacts.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="opp-contact">Contact</Label>
              <Select name="contact_id" defaultValue={opportunity?.contact_id ?? undefined}>
                <SelectTrigger id="opp-contact" className="w-full">
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
          <div className="space-y-2">
            <Label htmlFor="opp-notes">Notes</Label>
            <Textarea id="opp-notes" name="notes" rows={2} defaultValue={opportunity?.notes ?? undefined} />
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
