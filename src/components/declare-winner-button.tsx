"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { declareProjectWinner } from "@/lib/actions/projects";
import { Trophy, Loader2 } from "lucide-react";

export function DeclareWinnerButton({
  projectId,
  opportunityId,
  otherQuoteCount,
}: {
  projectId: string;
  opportunityId: string;
  otherQuoteCount: number;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    const warning =
      otherQuoteCount > 0
        ? `Mark this quote as the winner? The other ${otherQuoteCount} competing quote${otherQuoteCount === 1 ? "" : "s"} on this project will be removed.`
        : "Mark this quote as the winner?";
    if (!window.confirm(warning)) return;
    setError(null);
    startTransition(async () => {
      const result = await declareProjectWinner(projectId, opportunityId);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="inline-flex flex-col items-start">
      <Button type="button" size="xs" variant="outline" onClick={handleClick} disabled={pending}>
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Trophy className="size-3.5" />}
        Mark as winner
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
