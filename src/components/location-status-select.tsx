"use client";

import { useState, useTransition } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateLocationStatus } from "@/lib/actions/locations";
import { statusOptionsForCategory, STATUS_LABELS } from "@/lib/location-status";
import type { CompanyCategory, LocationStatus } from "@/lib/types";

// Inline status changer for a location's profile page. Options are scoped by the
// parent company's category — distributors only ever get Active/Inactive, everyone
// else (design firms, contractors, independents) gets the full Prospect/Active/
// Inactive set. This is the "switch to inactive" control for firms/contractors that
// don't want a Lunch & Learn or don't want to work with us.
export function LocationStatusSelect({
  locationId,
  companyId,
  status,
  category,
}: {
  locationId: string;
  companyId: string | null;
  status: LocationStatus;
  category?: CompanyCategory;
}) {
  const [current, setCurrent] = useState<LocationStatus>(status);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const options = statusOptionsForCategory(category);

  function handleChange(value: string) {
    const next = value as LocationStatus;
    const prev = current;
    setCurrent(next);
    setError(null);
    startTransition(async () => {
      const result = await updateLocationStatus(locationId, next, companyId);
      if (result?.error) {
        setError(result.error);
        setCurrent(prev);
      }
    });
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <Select value={current} onValueChange={handleChange} disabled={pending}>
        <SelectTrigger size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
