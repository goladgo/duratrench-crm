"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { PlannedVisitStatus } from "@/lib/types";

export interface FormState {
  error?: string;
  success?: boolean;
}

export async function addPlannedVisit(_prevState: FormState, formData: FormData): Promise<FormState> {
  const locationId = String(formData.get("location_id") ?? "").trim();
  const plannedDate = String(formData.get("planned_date") ?? "").trim();

  if (!locationId) return { error: "Choose a stop." };
  if (!plannedDate) return { error: "Missing date." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase.from("planned_visits").insert({
    location_id: locationId,
    planned_date: plannedDate,
    rep_id: user.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/");
  return { success: true };
}

export async function updatePlannedVisitStatus(
  id: string,
  status: PlannedVisitStatus
): Promise<{ error?: string } | void> {
  const supabase = await createClient();
  const { error } = await supabase.from("planned_visits").update({ status }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/");
}

export async function deletePlannedVisit(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("planned_visits").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/");
  return {};
}

// Persists a drag-and-drop reorder from the weekly planner. Each group is one
// day's column, given as the full ordered list of stop IDs that should now be in
// that day — for a same-day reorder this is a single group; for a cross-day move
// it's two groups (source day without the moved stop, destination day with it
// inserted at its new spot). Setting planned_date on every stop in a group (not
// just the moved one) is redundant for stops that didn't change day, but keeps
// this one simple loop rather than needing to diff old vs. new date per stop.
export async function reorderPlannedVisits(
  groups: { date: string; stopIds: string[] }[]
): Promise<{ error?: string }> {
  const supabase = await createClient();

  for (const group of groups) {
    for (let i = 0; i < group.stopIds.length; i++) {
      const { error } = await supabase
        .from("planned_visits")
        .update({ planned_date: group.date, position: i })
        .eq("id", group.stopIds[i]);
      if (error) return { error: error.message };
    }
  }

  revalidatePath("/");
  return {};
}
