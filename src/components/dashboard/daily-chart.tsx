"use client";

import { Bar, BarChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import type { Dashboard } from "@/lib/data/dashboard";
import { formatCompact, formatMoney } from "@/lib/money";

const config = {
  amount: { label: "Chiqim", color: "var(--chart-expense)" },
} satisfies ChartConfig;

type Point = Dashboard["daily"][number];

/** Oy ichida har kungi chiqim (bitta seriya) va kunlik o'rtacha chizig'i */
export function DailyChart({ daily, average }: { daily: Point[]; average: number }) {
  return (
    <ChartContainer config={config} className="aspect-auto h-56 w-full">
      <BarChart data={daily} margin={{ top: 16, right: 8, left: 0, bottom: 0 }} barCategoryGap={2}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} minTickGap={8} />
        <YAxis tickLine={false} axisLine={false} width={76} tickFormatter={(v: number) => formatCompact(v)} />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", opacity: 0.5 }}
          content={({ active, payload }) => {
            const point = payload?.[0]?.payload as Point | undefined;
            if (!active || !point) return null;
            return (
              <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                <p className="text-muted-foreground">{point.label}</p>
                <p className="mt-0.5 text-sm font-semibold text-foreground">
                  {point.future ? "Hali kelmagan" : formatMoney(point.amount)}
                </p>
              </div>
            );
          }}
        />
        {average > 0 && (
          <ReferenceLine
            y={average}
            stroke="var(--muted-foreground)"
            strokeWidth={1}
            label={{
              value: `o'rtacha ${formatCompact(average)}`,
              position: "insideTopRight",
              fontSize: 11,
              fill: "var(--muted-foreground)",
            }}
          />
        )}
        <Bar dataKey="amount" fill="var(--color-amount)" radius={[4, 4, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ChartContainer>
  );
}
