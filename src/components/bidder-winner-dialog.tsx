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
import { Trophy } from "lucide-react";
import { declareBidderWinner } from "@/lib/actions/project-bidders";

// Marks a bidder as the winner and records the price it actually sold for. The project's own price
// is only an estimate, so it pre-fills the box but is expected to be edited.
export function BidderWinnerDialog({
  projectId,
  bidderId,
  bidderLabel,
  defaultPrice,
  otherQuoteCount,
}: {
  projectId: string;
  bidderId: string;
  bidderLabel: string;
  defaultPrice: number | null;
  otherQuoteCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState(defaultPrice != null ? String(defaultPrice) : "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = await declareBidderWinner(projectId, bidderId, price);
      if (result?.error) setError(result.error);
      else setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" size="sm" variant="outline" />}>
        <Trophy className="size-4" />
        Won
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark as the winner</DialogTitle>
          <DialogDescription>
            {bidderLabel}
            {otherQuoteCount > 0
              ? `. The other ${otherQuoteCount} quote${otherQuoteCount === 1 ? "" : "s"} on this project will be removed. The bidder list stays.`
              : ". The bidder list stays."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor={`sold-${bidderId}`}>Sold price ($)</Label>
          <Input
            id={`sold-${bidderId}`}
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e: { target: { value: string } }) => setPrice(e.target.value)}
            placeholder="What it actually sold for"
          />
          <p className="text-xs text-muted-foreground">
            Pre-filled with the project&apos;s estimate. Change it to the real number. You can still edit it later.
          </p>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button type="button" onClick={confirm} disabled={pending}>
            {pending ? "Saving..." : "Mark as won"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
