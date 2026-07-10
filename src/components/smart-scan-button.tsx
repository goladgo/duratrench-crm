"use client";

import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { scanBusinessCard, type ScannedCard } from "@/lib/actions/scan-card";
import { matchScan, type ScanMatchResult } from "@/lib/actions/scan-match";
import { createFromScan, type ResolveScanResult } from "@/lib/actions/scan-resolve";
import { resizeImageToBase64 } from "@/lib/image-resize";
import { withTimeout } from "@/lib/with-timeout";
import { Camera, Loader2, CheckCircle2 } from "lucide-react";
import type { CompanyCategory } from "@/lib/types";

const initialState: ResolveScanResult = {};

function regionForState(state: string): "socal" | "vegas" {
  return state.trim().toUpperCase() === "NV" ? "vegas" : "socal";
}

export function SmartScanButton({
  defaultCategory = "distributor",
  triggerLabel = "Scan a Business Card",
}: {
  defaultCategory?: CompanyCategory;
  triggerLabel?: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [card, setCard] = useState<ScannedCard | null>(null);
  const [match, setMatch] = useState<ScanMatchResult | null>(null);
  const [mode, setMode] = useState<"existing_location" | "new_branch" | "new_company">("new_company");
  const [open, setOpen] = useState(false);

  const [state, formAction, pending] = useActionState(async (prevState: ResolveScanResult, formData: FormData) => {
    const result = await createFromScan(formData);
    if (result.locationId) {
      setOpen(false);
      router.push(`/locations/${result.locationId}`);
    }
    return result;
  }, initialState);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setScanError(null);

    try {
      const { base64, mediaType } = await resizeImageToBase64(file);

      const scanForm = new FormData();
      scanForm.append("photoBase64", base64);
      scanForm.append("mediaType", mediaType);
      const scanResult = await withTimeout(scanBusinessCard(scanForm), 25000, "Scan timed out — check your connection and try again.");

      if (scanResult.error || !scanResult.data) {
        setScanError(scanResult.error ?? "Couldn't read the card.");
        return;
      }

      const matchResult = await withTimeout(
        matchScan(scanResult.data.company, scanResult.data.city),
        10000,
        "Lookup timed out — check your connection and try again."
      );

      setCard(scanResult.data);
      setMatch(matchResult);
      setMode(matchResult.location ? "existing_location" : matchResult.company ? "new_branch" : "new_company");
      setOpen(true);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Scan failed. Try again.");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button size="lg" className="w-full" type="button" disabled={busy} onClick={() => fileInputRef.current?.click()}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
        {busy ? "Reading card..." : triggerLabel}
      </Button>
      {scanError && <p className="mt-1 text-center text-sm text-destructive">{scanError}</p>}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Details</DialogTitle>
          </DialogHeader>
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="mode" value={mode} />

            {mode === "existing_location" && match?.location && (
              <div className="space-y-2 rounded-lg border bg-muted/50 p-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CheckCircle2 className="size-4 text-primary" />
                  Matches an existing stop
                </div>
                <p className="text-sm">{match.location.name}</p>
                {match.location.companies?.name && <Badge variant="secondary">{match.location.companies.name}</Badge>}
                <input type="hidden" name="existing_location_id" value={match.location.id} />
                <button
                  type="button"
                  className="text-sm text-primary hover:underline"
                  onClick={() => setMode(match.company ? "new_branch" : "new_company")}
                >
                  Not the right stop? Enter it manually
                </button>
              </div>
            )}

            {mode === "new_branch" && match?.company && (
              <div className="space-y-3 rounded-lg border p-3">
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="secondary">{match.company.name}</Badge>
                  <span className="text-muted-foreground">is already in your CRM — adding a new branch</span>
                </div>
                <input type="hidden" name="existing_company_id" value={match.company.id} />
                <div className="space-y-2">
                  <Label htmlFor="scan-loc-name">Branch name</Label>
                  <Input id="scan-loc-name" name="location_name" defaultValue={card?.company} key={`ln-${card?.company}`} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scan-address">Address</Label>
                  <Input id="scan-address" name="address" defaultValue={card?.address} key={`addr-${card?.address}`} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Input name="city" placeholder="City" defaultValue={card?.city} key={`city-${card?.city}`} />
                  <Input name="state" placeholder="State" defaultValue={card?.state || "CA"} key={`state-${card?.state}`} />
                  <Input name="zip" placeholder="Zip" defaultValue={card?.zip} key={`zip-${card?.zip}`} />
                </div>
                <Select name="territory_region" defaultValue={regionForState(card?.state ?? "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="socal">SoCal</SelectItem>
                    <SelectItem value="vegas">Las Vegas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {mode === "new_company" && (
              <div className="space-y-3 rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">New company &amp; location</p>
                <div className="space-y-2">
                  <Label htmlFor="scan-company-name">Company</Label>
                  <Input id="scan-company-name" name="company_name" defaultValue={card?.company} key={`cn-${card?.company}`} required />
                </div>
                <Select name="category" defaultValue={defaultCategory}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="distributor">Distributor</SelectItem>
                    <SelectItem value="civil_engineering">Civil Engineering</SelectItem>
                    <SelectItem value="landscape_architecture">Landscape Architecture</SelectItem>
                    <SelectItem value="contractor">Contractor</SelectItem>
                  </SelectContent>
                </Select>
                <div className="space-y-2">
                  <Label htmlFor="scan-loc-name2">Location name</Label>
                  <Input id="scan-loc-name2" name="location_name" defaultValue={card?.company} key={`ln2-${card?.company}`} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scan-address2">Address</Label>
                  <Input id="scan-address2" name="address" defaultValue={card?.address} key={`addr2-${card?.address}`} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Input name="city" placeholder="City" defaultValue={card?.city} key={`city2-${card?.city}`} />
                  <Input name="state" placeholder="State" defaultValue={card?.state || "CA"} key={`state2-${card?.state}`} />
                  <Input name="zip" placeholder="Zip" defaultValue={card?.zip} key={`zip2-${card?.zip}`} />
                </div>
                <Select name="territory_region" defaultValue={regionForState(card?.state ?? "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="socal">SoCal</SelectItem>
                    <SelectItem value="vegas">Las Vegas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-3 rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Contact</p>
              <div className="space-y-2">
                <Label htmlFor="scan-contact-name">Name</Label>
                <Input id="scan-contact-name" name="contact_name" defaultValue={card?.name} key={`name-${card?.name}`} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="scan-contact-title">Title</Label>
                  <Input id="scan-contact-title" name="contact_title" defaultValue={card?.title} key={`title-${card?.title}`} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scan-contact-phone">Phone</Label>
                  <Input id="scan-contact-phone" name="contact_phone" defaultValue={card?.phone} key={`phone-${card?.phone}`} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="scan-contact-email">Email</Label>
                <Input id="scan-contact-email" name="contact_email" defaultValue={card?.email} key={`email-${card?.email}`} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="is_primary" className="size-4" defaultChecked />
                Primary contact
              </label>
            </div>

            {state.error && <p className="text-sm text-destructive">{state.error}</p>}
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
