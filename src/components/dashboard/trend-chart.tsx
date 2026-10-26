"use client";

import { ColumnChart } from "@/components/plot";
import type { Dashboard } from "@/lib/data/dashboard";
import { formatMoney } from "@/lib/money";

// Kirim/chiqim juftligi rang ko'rlikka chidamli tekshiruvdan o'tgan (globals.css: --chart-income/expense)
const SERIES = [
  { key: "income", label: "Kirim", color: "var(--chart-income)" },
  { key: "expense", label: "Chiqim", color: "var(--chart-expense)" },
] as const;

type Point = Dashboard["trend"][number];

/** 12 oy: har oy kirim va chiqim yonma-yon ustunlar */
export function TrendChart({ trend }: { trend: Point[] }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4 text-xs text-muted-foreground">
        {SERIES.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <ColumnChart
        data={trend}
        series={[...SERIES]}
        height={232}
        label="12 oy davomida har oy kirim va chiqim"
        xLabel={(p) => p.short}
        tooltip={(point) => (
          <div className="min-w-44 space-y-1">
            <p className="text-muted-foreground">{point.label}</p>
            {SERIES.map((s) => (
              <p key={s.key} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.label}
                </span>
                <span className="font-semibold text-foreground">{formatMoney(point[s.key])}</span>
              </p>
            ))}
            <p className="border-t pt-1 text-muted-foreground">Natija: {formatMoney(point.income - point.expense, { sign: true })}</p>
          </div>
        )}
      />
    </div>
  );
}
