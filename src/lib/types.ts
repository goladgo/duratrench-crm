export type CompanyCategory = "distributor" | "civil_engineering" | "landscape_architecture" | "contractor";
export type DistributorType = "waterworks" | "plumbing" | "both";
export type TerritoryRegion = "socal" | "vegas";
export type LocationStatus = "prospect" | "active" | "inactive";
export type OpportunityKind = "quote" | "spec";
export type OpportunityStage = "quoted" | "negotiating" | "won" | "lost";
export type PlannedVisitStatus = "planned" | "completed" | "skipped";

export interface Company {
  id: string;
  rep_id: string;
  name: string;
  category: CompanyCategory;
  website: string | null;
  notes: string | null;
  created_at: string;
}

export interface Location {
  id: string;
  rep_id: string;
  company_id: string | null;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  lat: number | null;
  lng: number | null;
  distributor_type: DistributorType | null;
  territory_region: TerritoryRegion;
  status: LocationStatus;
  lunch_learn_completed_at: string | null;
  lunch_learn_scheduled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  rep_id: string;
  location_id: string;
  name: string;
  title: string | null;
  phone: string | null;
  email: string | null;
  is_primary: boolean;
  notes: string | null;
  created_at: string;
}

export interface VisitNote {
  id: string;
  rep_id: string;
  location_id: string;
  contact_id: string | null;
  visit_date: string;
  notes: string;
  follow_up_date: string | null;
  created_at: string;
}

export interface Opportunity {
  id: string;
  rep_id: string;
  location_id: string;
  contact_id: string | null;
  kind: OpportunityKind;
  title: string;
  product_line: string | null;
  amount: number | null;
  stage: OpportunityStage;
  quote_date: string;
  close_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface PlannedVisit {
  id: string;
  rep_id: string;
  location_id: string;
  planned_date: string;
  status: PlannedVisitStatus;
  notes: string | null;
  created_at: string;
}

export interface PlannedVisitWithLocation extends PlannedVisit {
  locations:
    | (Pick<Location, "id" | "name" | "city" | "state" | "territory_region"> & {
        companies: Pick<Company, "id" | "name" | "category"> | null;
      })
    | null;
}

export interface CompanyRollup {
  company_id: string;
  rep_id: string;
  location_count: number;
  active_location_count: number;
  contact_count: number;
  open_value: number;
  won_value: number;
  last_visit_date: string | null;
}

export interface LocationWithCompany extends Location {
  companies: Pick<Company, "id" | "name" | "category"> | null;
}
