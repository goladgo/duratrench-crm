"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";

// `action` must be a direct reference to an imported Server Action (not wrapped in a
// new closure) so Next.js can serialize it across the server/client boundary; this
// component supplies the arguments and invokes it client-side.
export function DeleteButton<Args extends unknown[]>({
  action,
  args,
  confirmMessage,
  size = "icon-sm",
  variant = "ghost",
  label,
}: {
  action: (...args: Args) => Promise<{ error?: string } | void>;
  args: Args;
  confirmMessage: string;
  size?: "icon-sm" | "icon" | "sm";
  variant?: "ghost" | "outline" | "destructive";
  label?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (!window.confirm(confirmMessage)) return;
    setError(null);
    startTransition(async () => {
      const result = await action(...args);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="inline-flex flex-col items-start">
      <Button type="button" size={size} variant={variant} onClick={handleClick} disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
        {label}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
