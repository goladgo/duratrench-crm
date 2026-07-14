"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { AddStopDialog } from "@/components/add-stop-dialog";
import { PlannerStopCard } from "@/components/planner-stop-card";
import { SortableStopCard } from "@/components/sortable-stop-card";
import { reorderPlannedVisits } from "@/lib/actions/planner";
import { formatShortLabel } from "@/lib/date-utils";
import type { LocationWithCompany, PlannedVisitWithLocation } from "@/lib/types";

type DayGroup = { date: string; weekdayLabel: string; stops: PlannedVisitWithLocation[] };
type ItemsByDate = Record<string, string[]>;

function arraysEqual(a: string[], b: string[]) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

// Resolve which day column a dragged id currently belongs to. `id` may be a
// container id (a date, when dropped on an empty column or the column
// background) or a stop id (when dropped on/near another card).
function findContainer(id: string, items: ItemsByDate): string | undefined {
  if (id in items) return id;
  return Object.keys(items).find((date) => items[date].includes(id));
}

function DayColumn({
  date,
  weekdayLabel,
  dayLabel,
  stops,
  locations,
}: {
  date: string;
  weekdayLabel: string;
  dayLabel: string;
  stops: PlannedVisitWithLocation[];
  locations: LocationWithCompany[];
}) {
  const { setNodeRef } = useDroppable({ id: date });
  const stopIds = stops.map((s) => s.id);

  return (
    <div ref={setNodeRef} className="space-y-2 rounded-lg border p-3">
      <div>
        <p className="text-sm font-medium">{weekdayLabel}</p>
        <p className="text-xs text-muted-foreground">{formatShortLabel(date)}</p>
      </div>
      <SortableContext items={stopIds} strategy={verticalListSortingStrategy}>
        <div className="min-h-10 space-y-2">
          {stops.map((stop) => (
            <SortableStopCard key={stop.id} stop={stop} />
          ))}
        </div>
      </SortableContext>
      <AddStopDialog date={date} dayLabel={dayLabel} locations={locations} />
    </div>
  );
}

// Drag-and-drop board for the weekly planner: each weekday is a droppable +
// sortable column, so a rep can reorder stops within a day or drag one to a
// different day. Local state is the source of truth while dragging (dnd-kit's
// standard "multiple containers" pattern — cross-column moves are applied live
// in onDragOver so the UI tracks the pointer, then onDragEnd finalizes same-
// column ordering and persists whichever day(s) actually changed).
export function WeeklyPlannerBoard({
  stopsByDate,
  locations,
}: {
  stopsByDate: DayGroup[];
  locations: LocationWithCompany[];
}) {
  const stopById = useMemo(() => {
    const map = new Map<string, PlannedVisitWithLocation>();
    for (const day of stopsByDate) for (const stop of day.stops) map.set(stop.id, stop);
    return map;
  }, [stopsByDate]);

  const [items, setItems] = useState<ItemsByDate>(() => {
    const initial: ItemsByDate = {};
    for (const day of stopsByDate) initial[day.date] = day.stops.map((s) => s.id);
    return initial;
  });

  const [activeId, setActiveId] = useState<string | null>(null);
  const dragStartRef = useRef<ItemsByDate>({});
  const [, startTransition] = useTransition();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
    dragStartRef.current = items;
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    const activeContainer = findContainer(activeIdStr, items);
    const overContainer = findContainer(overIdStr, items);
    if (!activeContainer || !overContainer || activeContainer === overContainer) return;

    setItems((prev) => {
      const activeItems = prev[activeContainer];
      const overItems = prev[overContainer];
      if (!activeItems.includes(activeIdStr)) return prev;

      const overIndex = overItems.indexOf(overIdStr);
      const newIndex = overIndex >= 0 ? overIndex : overItems.length;

      return {
        ...prev,
        [activeContainer]: activeItems.filter((id) => id !== activeIdStr),
        [overContainer]: [...overItems.slice(0, newIndex), activeIdStr, ...overItems.slice(newIndex)],
      };
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);
    const activeContainer = findContainer(activeIdStr, items);
    const overContainer = findContainer(overIdStr, items);
    if (!activeContainer || !overContainer) return;

    let finalItems = items;
    if (activeContainer === overContainer) {
      const list = items[activeContainer];
      const activeIndex = list.indexOf(activeIdStr);
      const overIndex = list.indexOf(overIdStr);
      if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
        const reordered = [...list];
        reordered.splice(activeIndex, 1);
        reordered.splice(overIndex, 0, activeIdStr);
        finalItems = { ...items, [activeContainer]: reordered };
        setItems(finalItems);
      }
    }

    const before = dragStartRef.current;
    const groups = Object.keys(finalItems)
      .filter((date) => !arraysEqual(before[date] ?? [], finalItems[date]))
      .map((date) => ({ date, stopIds: finalItems[date] }));

    if (groups.length > 0) {
      startTransition(() => {
        void reorderPlannedVisits(groups);
      });
    }
  }

  const activeStop = activeId ? (stopById.get(activeId) ?? null) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {stopsByDate.map(({ date, weekdayLabel }) => (
          <DayColumn
            key={date}
            date={date}
            weekdayLabel={weekdayLabel}
            dayLabel={`${weekdayLabel}, ${formatShortLabel(date)}`}
            stops={(items[date] ?? [])
              .map((id) => stopById.get(id))
              .filter((s): s is PlannedVisitWithLocation => !!s)}
            locations={locations}
          />
        ))}
      </div>
      <DragOverlay>
        {activeStop ? (
          <div className="rotate-1 opacity-90 shadow-lg">
            <PlannerStopCard stop={activeStop} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
