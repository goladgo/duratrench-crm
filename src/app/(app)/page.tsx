import Link from "next/link";
import { Building2, MapPin, PlusCircle, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SHORTCUTS = [
  { href: "/visits/new", label: "Log a Visit", description: "Quickly note a stop you just made", icon: PlusCircle },
  { href: "/locations", label: "Distributor Locations", description: "Waterworks & plumbing branches", icon: MapPin },
  { href: "/companies", label: "Companies", description: "Parent chains & rollup performance", icon: Building2 },
  { href: "/firms", label: "Design Firms", description: "Civil engineers & landscape architects", icon: Users },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome back</h1>
        <p className="text-muted-foreground">Southern California & Las Vegas territory</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {SHORTCUTS.map(({ href, label, description, icon: Icon }) => (
          <Link key={href} href={href}>
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                <Icon className="size-6 text-primary" />
                <CardTitle className="text-base">{label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
