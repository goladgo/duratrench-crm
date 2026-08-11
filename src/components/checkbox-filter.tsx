"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

// A checkbox bound to a URL search param -- toggling it pushes a new URL with that
// param set/removed, preserving every other current param. Used for the "show all
// reps" / "show other reps' offices" toggles on /firms and /companies/[id], which are
// plain Server Components driven by searchParams (same pattern as the existing
// type/q filters on /firms), so the toggle needs to feel instant without a separate
// submit button.
export function CheckboxFilter({
  paramName,
  label,
  className,
}: {
  paramName: string;
  label: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const checked = searchParams.get(paramName) === "1";

  function toggle(e: React.ChangeEvent<HTMLInputElement>) {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.checked) {
      params.set(paramName, "1");
    } else {
      params.delete(paramName);
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <label className={cn("flex items-center gap-2 text-sm text-muted-foreground select-none", className)}>
      <input
        type="checkbox"
        checked={checked}
        onChange={toggle}
        className="size-4 rounded border-input accent-primary"
      />
      {label}
    </label>
  );
}
