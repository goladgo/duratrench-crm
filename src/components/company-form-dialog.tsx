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
import { createCompany, type FormState } from "@/lib/actions/companies";
import type { CompanyCategory } from "@/lib/types";
import { PlusCircle } from "lucide-react";

const CATEGORY_LABELS: Record<CompanyCategory, string> = {
  distributor: "Distributor",
  civil_engineering: "Civil Engineering",
  landscape_architecture: "Landscape Architecture",
  contractor: "Contractor",
};

const initialState: FormState = {};

export function CompanyFormDialog({
  categories,
  triggerLabel = "Add Company",
}: {
  categories: CompanyCategory[];
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (prevState: FormState, formData: FormData) => {
    const result = await createCompany(prevState, formData);
    if (result.success) setOpen(false);
    return result;
  }, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <PlusCircle className="size-4" />
        {triggerLabel}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{triggerLabel}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company-name">Name</Label>
            <Input id="company-name" name="name" required placeholder="e.g. Ferguson Waterworks" />
          </div>
          {categories.length > 1 ? (
            <div className="space-y-2">
              <Label htmlFor="company-category">Type</Label>
              <Select name="category" defaultValue={categories[0]}>
                <SelectTrigger id="company-category" className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <input type="hidden" name="category" value={categories[0]} />
          )}
          <div className="space-y-2">
            <Label htmlFor="company-website">Website</Label>
            <Input id="company-website" name="website" type="url" placeholder="https://" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-notes">Notes</Label>
            <Textarea id="company-notes" name="notes" rows={3} />
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
