"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deletePlannedVisit, updatePlannedVisitStatus } from "@/lib/actions/planner";
import { Check, ClipboardList, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlannedVisitWithLocation } from "@/lib/types";

export function PlannerStopCard({ stop }: { stop: PlannedVisitWithLocation }) {
  const [pending, startTransition] = useTransition();
  const loc = stop.locations;

  function setStatus(status: "completed" | "planned") {
    startTransition(async () => {
      await updatePlannedVisitStatus(stop.id, status);
    });
  }

  function remove() {
    startTransition(async () => {
      await deletePlannedVisit(stop.id);
    });
  }

  return (
    <div
      className={cn(
        "rounded-lg border p-2.5 text-sm",
        stop.status === "completed" && "border-primary/30 bg-primary/5"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Link href={loc ? `/locations/${loc.id}` : "#"} className="min-w-0 flex-1">
          <p className="truncate font-medium hover:underline">{loc?.name ?? "Unknown stop"}</p>
          <p className="truncate text-xs text-muted-foreground">
            {loc?.companies?.name ?? "Independent"}
            {loc?.city ? ` · ${loc.city}` : ""}
          </p>
        </Link>
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          className="shrink-0 text-muted-foreground hover:text-destructive disabled:opacity-50"
          aria-label="Remove stop"
        >
          <X className="size-3.5" />
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {loc && (
          <Button size="xs" variant="outline" nativeButton={false} render={<Link href={`/visits/log/${loc.id}`} />}>
            <ClipboardList className="size-3.5" />
            Log Visit
          </Button>
        )}
        {stop.status !== "completed" ? (
          <Button size="xs" variant="ghost" type="button" disabled={pending} onClick={() => setStatus("completed")}>
            <Check className="size-3.5" />
            Done
          </Button>
        ) : (
          <Button size="xs" variant="ghost" type="button" disabled={pending} onClick={() => setStatus("planned")}>
            <RotateCcw className="size-3.5" />
            Undo
          </Button>
        )}
      </div>
    </div>
  );
}
