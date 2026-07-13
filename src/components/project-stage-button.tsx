"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function ProjectStageButton({
  action,
  projectId,
  label,
  icon: Icon,
  confirmMessage,
  variant = "outline",
}: {
  action: (id: string) => Promise<{ error?: string } | void>;
  projectId: string;
  label: string;
  icon: LucideIcon;
  confirmMessage?: string;
  variant?: "outline" | "ghost" | "destructive";
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setError(null);
    startTransition(async () => {
      const result = await action(projectId);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="inline-flex flex-col items-start">
      <Button type="button" size="sm" variant={variant} onClick={handleClick} disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />}
        {label}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
