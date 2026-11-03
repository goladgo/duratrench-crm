import { createClient } from "@/lib/supabase/server";

export interface ProjectBidder {
  id: string;
  contactId: string;
  name: string;
  phone: string | null;
  email: string | null;
  locationId: string;
  locationName: string;
  city: string | null;
  companyId: string | null;
  companyName: string | null;
  category: string | null;
}

type CompanyRel = { id: string; name: string; category: string };
type LocationRel = { id: string; name: string; city: string | null; companies: CompanyRel | CompanyRel[] | null };
type ContactRel = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  locations: LocationRel | LocationRel[] | null;
};
type Row = { id: string; contact_id: string; contacts: ContactRel | ContactRel[] | null };

function one<T>(rel: T | T[] | null | undefined): T | null {
  if (Array.isArray(rel)) return rel[0] ?? null;
  return rel ?? null;
}

// Everyone bidding a project, with their branch and company resolved for display.
export async function listProjectBidders(projectId: string): Promise<ProjectBidder[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_bidders")
    .select("id, contact_id, contacts(id, name, phone, email, locations(id, name, city, companies(id, name, category)))")
    .eq("project_id", projectId)
    .order("created_at");
  if (error) throw new Error(error.message);

  const bidders: ProjectBidder[] = [];
  for (const r of (data ?? []) as unknown as Row[]) {
    const contact = one(r.contacts);
    const location = one(contact?.locations);
    if (!contact || !location) continue;
    const company = one(location.companies);
    bidders.push({
      id: r.id,
      contactId: contact.id,
      name: contact.name,
      phone: contact.phone,
      email: contact.email,
      locationId: location.id,
      locationName: location.name,
      city: location.city,
      companyId: company?.id ?? null,
      companyName: company?.name ?? null,
      category: company?.category ?? null,
    });
  }
  return bidders;
}
