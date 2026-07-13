"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, HardHat, LayoutDashboard, PlusCircle, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/companies", label: "Distributors", icon: Building2 },
  { href: "/visits/new", label: "Log Visit", icon: PlusCircle },
  { href: "/firms", label: "Firms", icon: Users },
  { href: "/contractors", label: "Contractors", icon: HardHat },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background md:hidden">
      <ul className="flex items-stretch justify-between">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 text-xs font-medium",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="size-5" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
