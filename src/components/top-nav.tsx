import Link from "next/link";
import { Briefcase, Building2, FileText, HardHat, LayoutDashboard, PlusCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/login/actions";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/companies", label: "Distributors", icon: Building2 },
  { href: "/firms", label: "Design Firms", icon: Users },
  { href: "/contractors", label: "Contractors", icon: HardHat },
  { href: "/projects", label: "Projects", icon: Briefcase },
  { href: "/reports", label: "Reports", icon: FileText },
];

export function TopNav({ email }: { email: string | null }) {
  return (
    <header className="hidden border-b bg-background md:block">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-8">
          <Link href="/" className="font-semibold">
            DuraTrench
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                <Icon className="size-4" />
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            nativeButton={false}
            render={
              <Link href="/visits/new">
                <PlusCircle className="size-4" />
                Log Activity
              </Link>
            }
          />
          <span className="text-sm text-muted-foreground">{email}</span>
          <form action={signOut}>
            <Button variant="ghost" size="sm" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
