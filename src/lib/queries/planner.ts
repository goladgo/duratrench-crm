import { createClient } from "@/lib/supabase/server";
import type { PlannedVisitWithLocation } from "@/lib/types";

export async function listPlannedVisits(startDate: string, endDate: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("planned_visits")
    .select("*, locations(id, name, city, state, territory_region, companies(id, name, category))")
    .gte("planned_date", startDate)
    .lte("planned_date", endDate)
    .order("planned_date")
    .order("created_at");

  if (error) throw new Error(error.message);
  return (data ?? []) as PlannedVisitWithLocation[];
}

export interface UpcomingLunchLearn {
  locationId: string;
  locationName: string;
  city: string | null;
  companyId: string | null;
  companyName: string | null;
  scheduledAt: string;
}

export async function listUpcomingLunchLearns(limit = 8): Promise<UpcomingLunchLearn[]> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("locations")
    .select("id, name, city, lunch_learn_scheduled_at, companies(id, name)")
    .not("lunch_learn_scheduled_at", "is", null)
    .gte("lunch_learn_scheduled_at", today)
    .order("lunch_learn_scheduled_at", { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);

  type Row = {
    id: string;
    name: string;
    city: string | null;
    lunch_learn_scheduled_at: string;
    companies: { id: string; name: string } | null;
  };

  return ((data ?? []) as Row[]).map((loc) => ({
    locationId: loc.id,
    locationName: loc.name,
    city: loc.city,
    companyId: loc.companies?.id ?? null,
    companyName: loc.companies?.name ?? null,
    scheduledAt: loc.lunch_learn_scheduled_at,
  }));
}
