"use client";

import { AreaChart } from "@/components/plot";
import type { MonthHistory } from "@/lib/data/budget";
import { MONTH_NAMES } from "@/lib/dates";
import { formatMoney } from "@/lib/money";

/** Har oy oxiridagi jami pul — jamg'arma qanday o'zgargani (bitta seriya, afsonasiz) */
export function SavingsChart({ history }: { history: MonthHistory[] }) {
  return (
    <AreaChart
      data={history}
      value={(h) => h.end}
      color="var(--chart-1)"
      height={232}
      label="Har oy oxiridagi jami pul"
      xLabel={(h) => MONTH_NAMES[Number(h.month.slice(5)) - 1].slice(0, 3)}
      tooltip={(h) => (
        <div className="min-w-44">
          <p className="text-muted-foreground">{h.label}</p>
          <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-foreground">
            <span className="h-0.5 w-3 rounded-full bg-chart-1" />
            {formatMoney(h.end)}
          </p>
          <p className="mt-0.5 text-muted-foreground">Oy natijasi: {formatMoney(h.end - h.start, { sign: true })}</p>
        </div>
      )}
    />
  );
}
