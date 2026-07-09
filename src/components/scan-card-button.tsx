"use client";

import { useActionState, useRef, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { createContact, type FormState } from "@/lib/actions/contacts";
import { scanBusinessCard } from "@/lib/actions/scan-card";
import { Camera, Loader2 } from "lucide-react";

const initialState: FormState = {};

export function ScanCardButton({ locationId }: { locationId: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<{ name: string; title: string; phone: string; email: string } | null>(null);
  const [open, setOpen] = useState(false);

  const [state, formAction, pending] = useActionState(async (prevState: FormState, formData: FormData) => {
    const result = await createContact(prevState, formData);
    if (result.success) setOpen(false);
    return result;
  }, initialState);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    setScanError(null);

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    const base64Data = dataUrl.slice(dataUrl.indexOf(",") + 1);

    const formData = new FormData();
    formData.append("photoBase64", base64Data);
    formData.append("mediaType", file.type || "image/jpeg");
    const result = await scanBusinessCard(formData);

    setScanning(false);
    e.target.value = "";

    if (result.error) {
      setScanError(result.error);
      return;
    }
    if (result.data) {
      setExtracted(result.data);
      setOpen(true);
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
      <Button
        size="sm"
        variant="outline"
        type="button"
        disabled={scanning}
        onClick={() => fileInputRef.current?.click()}
      >
        {scanning ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
        {scanning ? "Reading card..." : "Scan Card"}
      </Button>
      {scanError && <p className="mt-1 text-sm text-destructive">{scanError}</p>}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Contact</DialogTitle>
          </DialogHeader>
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="location_id" value={locationId} />
            <div className="space-y-2">
              <Label htmlFor="scan-name">Name</Label>
              <Input id="scan-name" name="name" defaultValue={extracted?.name} key={extracted?.name} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="scan-title">Title</Label>
                <Input id="scan-title" name="title" defaultValue={extracted?.title} key={extracted?.title} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scan-phone">Phone</Label>
                <Input id="scan-phone" name="phone" type="tel" defaultValue={extracted?.phone} key={extracted?.phone} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="scan-email">Email</Label>
              <Input id="scan-email" name="email" type="email" defaultValue={extracted?.email} key={extracted?.email} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scan-notes">Notes</Label>
              <Textarea id="scan-notes" name="notes" rows={2} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="is_primary" className="size-4" />
              Primary contact
            </label>
            {state.error && <p className="text-sm text-destructive">{state.error}</p>}
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving..." : "Save Contact"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
