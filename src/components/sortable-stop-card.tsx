"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { PlannerStopCard } from "@/components/planner-stop-card";
import { cn } from "@/lib/utils";
import type { PlannedVisitWithLocation } from "@/lib/types";

// Wraps PlannerStopCard with a drag handle so a rep can reorder stops within a
// day or drag one into a different day's column. Kept as a separate wrapper
// (rather than baking dnd-kit into PlannerStopCard itself) so the card's own
// Log Activity / Done / Remove buttons keep working exactly as before — only the
// grip handle has drag listeners attached, not the whole card.
export function SortableStopCard({ stop }: { stop: PlannedVisitWithLocation }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stop.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn("flex items-start gap-1", isDragging && "opacity-40")}>
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="mt-2.5 shrink-0 touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical className="size-4" />
      </button>
      <div className="min-w-0 flex-1">
        <PlannerStopCard stop={stop} />
      </div>
    </div>
  );
}
