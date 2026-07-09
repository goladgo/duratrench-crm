import { createClient } from "@/lib/supabase/server";
import type { Contact, LocationStatus, LocationWithCompany, Opportunity, TerritoryRegion, VisitNote } from "@/lib/types";

export interface LocationFilters {
  region?: TerritoryRegion;
  status?: LocationStatus;
  search?: string;
}

export async function listLocations(filters: LocationFilters = {}) {
  const supabase = await createClient();
  let query = supabase
    .from("locations")
    .select("*, companies(id, name, category)")
    .order("name");

  if (filters.region) query = query.eq("territory_region", filters.region);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.search) query = query.ilike("name", `%${filters.search}%`);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as LocationWithCompany[];
}

export async function getLocationProfile(id: string) {
  const supabase = await createClient();

  const [
    { data: location, error: locationError },
    { data: contacts, error: contactsError },
    { data: visitNotes, error: visitNotesError },
    { data: opportunities, error: opportunitiesError },
  ] = await Promise.all([
    supabase.from("locations").select("*, companies(id, name, category)").eq("id", id).single(),
    supabase.from("contacts").select("*").eq("location_id", id).order("is_primary", { ascending: false }),
    supabase.from("visit_notes").select("*").eq("location_id", id).order("visit_date", { ascending: false }),
    supabase.from("opportunities").select("*").eq("location_id", id).order("quote_date", { ascending: false }),
  ]);

  if (locationError) throw new Error(locationError.message);
  if (contactsError) throw new Error(contactsError.message);
  if (visitNotesError) throw new Error(visitNotesError.message);
  if (opportunitiesError) throw new Error(opportunitiesError.message);

  return {
    location: location as LocationWithCompany,
    contacts: (contacts ?? []) as Contact[],
    visitNotes: (visitNotes ?? []) as VisitNote[],
    opportunities: (opportunities ?? []) as Opportunity[],
  };
}
