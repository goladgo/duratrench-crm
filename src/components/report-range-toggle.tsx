"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

// Switches the weekly overview cards on /reports ("This Week's Activities", "This Week's
// Quotes", "Projects Won This Week") between the current Mon-Sun week and the last two full
// Mon-Sun weeks, via a `?range=2w` URL param (absent/anything else = the default 1-week
// view) -- same URL-param-driven pattern as CheckboxFilter on /firms, so the toggle works
// without a client-side fetch and the chosen range survives a page reload/share.
const RANGE_OPTIONS = [
  { value: "1w", label: "This Week" },
  { value: "2w", label: "Last 2 Weeks" },
] as const;

export function ReportRangeToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("range") === "2w" ? "2w" : "1w";

  function setRange(value: (typeof RANGE_OPTIONS)[number]["value"]) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "1w") {
      params.delete("range");
    } else {
      params.set("range", value);
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="inline-flex shrink-0 items-center gap-0.5 rounded-lg border p-0.5">
      {RANGE_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => setRange(opt.value)}
          aria-pressed={current === opt.value}
          className={cn(
            "rounded-md px-3 py-1 text-sm font-medium transition-colors",
            current === opt.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
