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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createLocation, type FormState } from "@/lib/actions/locations";
import { TERRITORY_OPTIONS } from "@/lib/territory";
import { defaultStatusForCategory, statusOptionsForCategory, STATUS_LABELS } from "@/lib/location-status";
import { PlusCircle } from "lucide-react";
import type { CompanyCategory } from "@/lib/types";

const initialState: FormState = {};

export function LocationFormDialog({
  companies,
  presetCompanyId,
  presetCompanyCategory,
  triggerLabel = "Add Location",
  redirectTo,
}: {
  companies?: { id: string; name: string; category: CompanyCategory }[];
  presetCompanyId?: string;
  presetCompanyCategory?: CompanyCategory;
  triggerLabel?: string;
  redirectTo?: string;
}) {
  const [open, setOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | undefined>(undefined);
  const [state, formAction, pending] = useActionState(async (prevState: FormState, formData: FormData) => {
    const result = await createLocation(prevState, formData);
    if (result.success) setOpen(false);
    return result;
  }, initialState);

  // Category drives which status options make sense: known up front for the "Add
  // Location" button on a company's own profile page (presetCompanyCategory), or
  // derived from whichever company the rep just picked in the dropdown otherwise.
  // Unknown/independent locations get the full set — we can't assume they're not a
  // distributor's branch.
  const activeCategory =
    presetCompanyCategory ?? companies?.find((c) => c.id === selectedCompanyId)?.category ?? undefined;
  const statusOptions = statusOptionsForCategory(activeCategory);
  const defaultStatus = defaultStatusForCategory(activeCategory);

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
          {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}
          <div className="space-y-2">
            <Label htmlFor="location-name">Name</Label>
            <Input id="location-name" name="name" required placeholder="e.g. Ferguson Waterworks #1234" />
          </div>

          {presetCompanyId ? (
            <input type="hidden" name="company_id" value={presetCompanyId} />
          ) : (
            <div className="space-y-2">
              <Label htmlFor="location-company">Parent company (optional)</Label>
              <Select name="company_id" onValueChange={setSelectedCompanyId}>
                <SelectTrigger id="location-company" className="w-full">
                  <SelectValue placeholder="Independent / none" />
                </SelectTrigger>
                <SelectContent>
                  {(companies ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="location-region">Territory</Label>
              <Select name="territory_region" defaultValue="socal">
                <SelectTrigger id="location-region" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TERRITORY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location-status">Status</Label>
              <Select key={activeCategory ?? "unknown"} name="status" defaultValue={defaultStatus}>
                <SelectTrigger id="location-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location-distributor-type">Distributor type (if applicable)</Label>
            <Select name="distributor_type">
              <SelectTrigger id="location-distributor-type" className="w-full">
                <SelectValue placeholder="N/A" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="waterworks">Waterworks</SelectItem>
                <SelectItem value="plumbing">Plumbing</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location-address">Address</Label>
            <Input id="location-address" name="address" placeholder="Street address" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input name="city" placeholder="City" />
            <Input name="state" placeholder="State" defaultValue="CA" />
            <Input name="zip" placeholder="Zip" />
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
