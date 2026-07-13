"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { addPlannedVisit } from "@/lib/actions/planner";
import { PlusCircle, Loader2 } from "lucide-react";
import type { LocationWithCompany } from "@/lib/types";

export function AddStopDialog({
  date,
  dayLabel,
  locations,
}: {
  date: string;
  dayLabel: string;
  locations: LocationWithCompany[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = !q
      ? locations
      : locations.filter(
          (l) =>
            l.name.toLowerCase().includes(q) ||
            l.companies?.name?.toLowerCase().includes(q) ||
            l.city?.toLowerCase().includes(q)
        );
    return pool.slice(0, 30);
  }, [query, locations]);

  function handlePick(locationId: string) {
    setError(null);
    setAddingId(locationId);
    startTransition(async () => {
      const formData = new FormData();
      formData.append("location_id", locationId);
      formData.append("planned_date", date);
      const result = await addPlannedVisit({}, formData);
      setAddingId(null);
      if (result.error) {
        setError(result.error);
      } else {
        setOpen(false);
        setQuery("");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setQuery("");
          setError(null);
        }
      }}
    >
      <DialogTrigger render={<Button size="xs" variant="outline" className="w-full" />}>
        <PlusCircle className="size-3.5" />
        Add stop
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a stop — {dayLabel}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="Search distributors, firms, contractors..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No matches.</p>
            ) : (
              filtered.map((loc) => (
                <button
                  key={loc.id}
                  type="button"
                  disabled={pending}
                  onClick={() => handlePick(loc.id)}
                  className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50 disabled:opacity-50"
                >
                  <span>
                    <span className="font-medium">{loc.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {loc.companies?.name ?? "Independent"}
                      {loc.city ? ` · ${loc.city}` : ""}
                    </span>
                  </span>
                  {addingId === loc.id && pending && <Loader2 className="size-4 shrink-0 animate-spin" />}
                </button>
              ))
            )}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
