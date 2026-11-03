"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil } from "lucide-react";
import { setSoldPrice } from "@/lib/actions/project-bidders";

// Corrects the price a won project actually sold for (the winning quote's amount).
export function SoldPriceDialog({ projectId, currentAmount }: { projectId: string; currentAmount: number | null }) {
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState(currentAmount != null ? String(currentAmount) : "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await setSoldPrice(projectId, price);
      if (result?.error) setError(result.error);
      else setOpen(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next: boolean) => {
        setOpen(next);
        if (next) setPrice(currentAmount != null ? String(currentAmount) : "");
      }}
    >
      <DialogTrigger render={<Button type="button" size="sm" variant="ghost" />}>
        <Pencil className="size-3.5" />
        Edit sold price
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sold price</DialogTitle>
          <DialogDescription>What this project actually sold for.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="sold-price-edit">Sold price ($)</Label>
          <Input
            id="sold-price-edit"
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e: { target: { value: string } }) => setPrice(e.target.value)}
            autoFocus
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button type="button" onClick={save} disabled={pending}>
            {pending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
