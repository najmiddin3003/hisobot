"use client";

import { ColumnChart } from "@/components/plot";
import type { Dashboard } from "@/lib/data/dashboard";
import { formatCompact, formatMoney } from "@/lib/money";

type Point = Dashboard["daily"][number];

/** Oy ichida har kungi chiqim (bitta seriya) va kunlik o'rtacha chizig'i */
export function DailyChart({ daily, average }: { daily: Point[]; average: number }) {
  return (
    <ColumnChart
      data={daily}
      series={[{ key: "amount", label: "Chiqim", color: "var(--chart-expense)" }]}
      reference={{ value: average, label: `o'rtacha ${formatCompact(average)}` }}
      height={200}
      label="Oy ichida har kungi chiqim"
      xLabel={(p) => String(p.day)}
      tooltip={(point) => (
        <>
          <p className="text-muted-foreground">{point.label}</p>
          <p className="mt-0.5 text-sm font-semibold text-foreground">{point.future ? "Hali kelmagan" : formatMoney(point.amount)}</p>
        </>
      )}
    />
  );
}
