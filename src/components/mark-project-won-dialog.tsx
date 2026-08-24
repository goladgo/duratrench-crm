"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { declareProjectWinner } from "@/lib/actions/projects";
import { Trophy, Loader2 } from "lucide-react";
import type { ProjectQuote } from "@/lib/types";

function formatMoney(value: number | null) {
  if (value == null) return "—";
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

// Shown on the /projects list so a rep can mark a project won without drilling into
// its detail page. "Who won it" is answered by picking which of the project's
// existing quotes (each already tied to a distributor/contractor branch and contact)
// came out on top — same underlying action the detail page's per-quote
// "Mark as winner" button uses, just entered from a project-level button instead.
export function MarkProjectWonDialog({ projectId, quotes }: { projectId: string; quotes: ProjectQuote[] }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handlePick(opportunityId: string) {
    setError(null);
    startTransition(async () => {
      const result = await declareProjectWinner(projectId, opportunityId);
      if (result?.error) setError(result.error);
      else setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" size="sm" variant="outline" />}>
        <Trophy className="size-4" />
        Mark as Won
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Who won it?</DialogTitle>
          <DialogDescription>
            Pick the quote that won this project. The other{" "}
            {quotes.length > 1 ? `${quotes.length - 1} competing quote${quotes.length - 1 === 1 ? "" : "s"}` : "quotes"}{" "}
            on this project will be removed.
          </DialogDescription>
        </DialogHeader>
        {quotes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No quotes logged yet — log one from a branch&apos;s Quotes tab and pick this project first.
          </p>
        ) : (
          <div className="space-y-2">
            {quotes.map((q) => (
              <button
                key={q.id}
                type="button"
                disabled={pending}
                onClick={() => handlePick(q.id)}
                className="w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50 disabled:pointer-events-none disabled:opacity-50"
              >
                <p className="font-medium">
                  {q.locations?.companies?.name ?? "Independent"}
                  {q.locations?.name ? ` — ${q.locations.name}` : ""}
                </p>
                <p className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>{q.contacts?.name ?? "—"}</span>
                  <span>{formatMoney(q.amount)}</span>
                </p>
              </button>
            ))}
          </div>
        )}
        {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
