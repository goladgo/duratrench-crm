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
    .order("position");

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as PlannedVisitWithLocation[];
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

  type Company = { id: string; name: string };
  type Row = {
    id: string;
    name: string;
    city: string | null;
    lunch_learn_scheduled_at: string;
    // Supabase's JS types over-eagerly infer to-one relations as arrays when there's
    // no generated Database schema to confirm cardinality; at runtime a to-one relation
    // (locations.company_id -> companies.id) comes back as a single object. Accept both
    // shapes here rather than assuming one.
    companies: Company | Company[] | null;
  };

  return ((data ?? []) as unknown as Row[]).map((loc) => {
    const company = Array.isArray(loc.companies) ? (loc.companies[0] ?? null) : loc.companies;
    return {
      locationId: loc.id,
      locationName: loc.name,
      city: loc.city,
      companyId: company?.id ?? null,
      companyName: company?.name ?? null,
      scheduledAt: loc.lunch_learn_scheduled_at,
    };
  });
}
