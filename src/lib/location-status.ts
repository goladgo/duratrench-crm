import type { CompanyCategory, LocationStatus } from "@/lib/types";

// Distributors don't need prospect tracking — every distributor branch can already
// sell the product, so their locations only ever toggle between Active and Inactive.
// Design firms and contractors still go through a Prospect phase until a Lunch &
// Learn (or an equivalent direct relationship) makes them Active.
export function defaultStatusForCategory(category: CompanyCategory | null | undefined): LocationStatus {
  return category === "distributor" ? "active" : "prospect";
}

export function statusOptionsForCategory(category: CompanyCategory | null | undefined): LocationStatus[] {
  return category === "distributor" ? ["active", "inactive"] : ["prospect", "active", "inactive"];
}

export const STATUS_LABELS: Record<LocationStatus, string> = {
  prospect: "Prospect",
  active: "Active",
  inactive: "Inactive",
};
