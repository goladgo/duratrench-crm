import type { MonthlySales } from "@/lib/queries/projects";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const fullUSD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

// Compact label that fits above a narrow bar: $950, $12.4k, $1.2M.
function compactUSD(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(n >= 100_000 ? 0 : 1).replace(/\.0$/, "")}k`;
  return `$${Math.round(n)}`;
}

const CHART_HEIGHT = 140; // px available to the tallest bar

export function SalesChart({ months, year }: { months: MonthlySales[]; year: number }) {
  const yearTotal = months.reduce((sum, m) => sum + m.total, 0);
  const yearOrders = months.reduce((sum, m) => sum + m.orders, 0);
  const max = Math.max(...months.map((m) => m.total), 0);
  const hasSales = yearOrders > 0;

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{year} sales</p>
          <p className="text-2xl font-semibold tabular-nums">{fullUSD.format(yearTotal)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Orders</p>
          <p className="text-2xl font-semibold tabular-nums">{yearOrders}</p>
        </div>
      </div>

      {hasSales ? (
        <div className="grid grid-cols-12 gap-1 sm:gap-2" role="img" aria-label={`Monthly sales for ${year}`}>
          {months.map((m, i) => {
            const barHeight = max > 0 ? Math.max((m.total / max) * CHART_HEIGHT, m.orders > 0 ? 3 : 0) : 0;
            return (
              <div
                key={m.month}
                className="flex min-w-0 flex-col items-center"
                title={`${MONTH_LABELS[i]} ${year}: ${fullUSD.format(m.total)} · ${m.orders} order${m.orders === 1 ? "" : "s"}`}
              >
                <div className="flex w-full flex-col items-center justify-end" style={{ height: CHART_HEIGHT + 18 }}>
                  {m.orders > 0 && (
                    <span className="mb-1 text-[9px] leading-none tabular-nums text-muted-foreground sm:text-[11px]">
                      {compactUSD(m.total)}
                    </span>
                  )}
                  <div
                    className={`w-full max-w-9 rounded-t ${m.orders > 0 ? "bg-primary" : "bg-muted"}`}
                    style={{ height: m.orders > 0 ? barHeight : 2 }}
                  />
                </div>
                <div className="mt-1.5 w-full border-t pt-1.5 text-center">
                  <p className="text-[10px] font-medium sm:text-xs">{MONTH_LABELS[i]}</p>
                  <p className="text-[10px] tabular-nums text-muted-foreground sm:text-xs">{m.orders || "–"}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No won projects in {year} yet. Sales appear here once a project is marked Won.
        </p>
      )}

      {hasSales && <p className="mt-2 text-right text-[11px] text-muted-foreground">Numbers under each month = orders</p>}
    </div>
  );
}
