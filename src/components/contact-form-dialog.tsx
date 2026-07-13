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
import { createContact, updateContact, type FormState } from "@/lib/actions/contacts";
import { PlusCircle, Pencil } from "lucide-react";
import type { Contact } from "@/lib/types";

const initialState: FormState = {};

export function ContactFormDialog({ locationId, contact }: { locationId: string; contact?: Contact }) {
  const isEdit = !!contact;
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (prevState: FormState, formData: FormData) => {
    const result = isEdit ? await updateContact(prevState, formData) : await createContact(prevState, formData);
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
            Add Contact
          </>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Contact" : "Add Contact"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="location_id" value={locationId} />
          {isEdit && <input type="hidden" name="id" value={contact.id} />}
          <div className="space-y-2">
            <Label htmlFor="contact-name">Name</Label>
            <Input id="contact-name" name="name" required defaultValue={contact?.name} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="contact-title">Title</Label>
              <Input id="contact-title" name="title" defaultValue={contact?.title ?? undefined} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-phone">Phone</Label>
              <Input id="contact-phone" name="phone" type="tel" defaultValue={contact?.phone ?? undefined} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-email">Email</Label>
            <Input id="contact-email" name="email" type="email" defaultValue={contact?.email ?? undefined} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-notes">Notes</Label>
            <Textarea id="contact-notes" name="notes" rows={2} defaultValue={contact?.notes ?? undefined} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_primary" className="size-4" defaultChecked={contact?.is_primary} />
            Primary contact
          </label>
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
