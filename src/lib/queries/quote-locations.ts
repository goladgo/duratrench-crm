import { createClient } from "@/lib/supabase/server";

export interface QuoteLocation {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  companyName: string | null;
}

type CompanyRef = { name: string; category: string };

// Branches that can quote a project: distributors and contractors. Design firms "spec" jobs
// rather than quote them, so they're left out of the Add Quote picker.
export async function listQuoteLocations(): Promise<QuoteLocation[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("locations")
    .select("id, name, city, state, companies(name, category)")
    .order("name");
  if (error) throw new Error(error.message);

  type Row = {
    id: string;
    name: string;
    city: string | null;
    state: string | null;
    companies: CompanyRef | CompanyRef[] | null;
  };

  return ((data ?? []) as unknown as Row[])
    .map((r) => {
      const c = Array.isArray(r.companies) ? (r.companies[0] ?? null) : r.companies;
      return { row: r, company: c };
    })
    .filter(({ company }) => company?.category !== "civil_engineering" && company?.category !== "landscape_architecture")
    .map(({ row, company }) => ({
      id: row.id,
      name: row.name,
      city: row.city,
      state: row.state,
      companyName: company?.name ?? null,
    }));
}

export interface QuoteContact {
  id: string;
  name: string;
  locationId: string;
}

// Every contact the rep has, so the Add Quote picker can search people directly: choosing a
// person also chooses their branch. The dialog drops anyone whose branch isn't quote-capable.
export async function listQuoteContacts(): Promise<QuoteContact[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("contacts").select("id, name, location_id").order("name");
  if (error) throw new Error(error.message);
  return ((data ?? []) as { id: string; name: string; location_id: string }[]).map((c) => ({
    id: c.id,
    name: c.name,
    locationId: c.location_id,
  }));
}
