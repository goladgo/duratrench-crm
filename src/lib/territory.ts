import type { TerritoryRegion } from "@/lib/types";

export const TERRITORY_LABELS: Record<TerritoryRegion, string> = {
  socal: "SoCal",
  vegas: "Las Vegas",
  norcal: "Norcal",
  northern_nevada: "Northern Nevada",
  hawaii: "Hawaii",
};

export const TERRITORY_OPTIONS: { value: TerritoryRegion; label: string }[] = [
  { value: "socal", label: "SoCal" },
  { value: "vegas", label: "Las Vegas" },
  { value: "norcal", label: "Norcal" },
  { value: "northern_nevada", label: "Northern Nevada" },
  { value: "hawaii", label: "Hawaii" },
];
