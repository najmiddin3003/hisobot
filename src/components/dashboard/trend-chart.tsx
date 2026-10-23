"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import type { Dashboard } from "@/lib/data/dashboard";
import { formatCompact, formatMoney } from "@/lib/money";

// Kirim/chiqim juftligi rang ko'rlikka chidamli tekshiruvdan o'tgan (globals.css: --chart-income/expense)
const config = {
  income: { label: "Kirim", color: "var(--chart-income)" },
  expense: { label: "Chiqim", color: "var(--chart-expense)" },
} satisfies ChartConfig;

type Point = Dashboard["trend"][number];

/** 12 oy: har oy kirim va chiqim yonma-yon ustunlar */
export function TrendChart({ trend }: { trend: Point[] }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4 text-xs text-muted-foreground">
        {(["income", "expense"] as const).map((key) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ backgroundColor: config[key].color }} />
            {config[key].label}
          </span>
        ))}
      </div>
      <ChartContainer config={config} className="aspect-auto h-64 w-full">
        <BarChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2} barCategoryGap="20%">
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="short"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            interval="preserveStartEnd"
            minTickGap={6}
            fontSize={11}
          />
          <YAxis tickLine={false} axisLine={false} width={76} tickFormatter={(v: number) => formatCompact(v)} />
          <ChartTooltip
            cursor={{ fill: "var(--muted)", opacity: 0.5 }}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as Point | undefined;
              if (!active || !point) return null;
              return (
                <div className="min-w-44 space-y-1 rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                  <p className="text-muted-foreground">{point.label}</p>
                  {(["income", "expense"] as const).map((key) => (
                    <p key={key} className="flex items-center justify-between gap-4">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: config[key].color }} />
                        {config[key].label}
                      </span>
                      <span className="font-semibold text-foreground">{formatMoney(point[key])}</span>
                    </p>
                  ))}
                  <p className="border-t pt-1 text-muted-foreground">
                    Natija: {formatMoney(point.income - point.expense, { sign: true })}
                  </p>
                </div>
              );
            }}
          />
          <Bar dataKey="income" fill="var(--color-income)" radius={[4, 4, 0, 0]} maxBarSize={24} />
          <Bar dataKey="expense" fill="var(--color-expense)" radius={[4, 4, 0, 0]} maxBarSize={24} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
