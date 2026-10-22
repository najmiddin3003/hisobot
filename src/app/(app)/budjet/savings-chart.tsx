"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import type { MonthHistory } from "@/lib/data/budget";
import { MONTH_NAMES } from "@/lib/dates";
import { formatCompact, formatMoney } from "@/lib/money";

const config = {
  end: { label: "Oy oxiridagi qoldiq", color: "var(--chart-1)" },
} satisfies ChartConfig;

type Point = { short: string; label: string; end: number; net: number };

/** Har oy oxiridagi jami pul — jamg'arma qanday o'zgargani (bitta seriya, afsonasiz) */
export function SavingsChart({ history }: { history: MonthHistory[] }) {
  const data: Point[] = history.map((h) => ({
    short: MONTH_NAMES[Number(h.month.slice(5)) - 1].slice(0, 3),
    label: h.label,
    end: h.end,
    net: h.end - h.start,
  }));

  return (
    <ChartContainer config={config} className="aspect-auto h-64 w-full">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="short" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={64}
          tickFormatter={(value: number) => formatCompact(value)}
        />
        <ChartTooltip
          cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
          content={({ active, payload }) => {
            const point = payload?.[0]?.payload as Point | undefined;
            if (!active || !point) return null;
            return (
              <div className="min-w-44 rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                <p className="text-muted-foreground">{point.label}</p>
                <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <span className="h-0.5 w-3 rounded-full bg-[var(--color-end)]" />
                  {formatMoney(point.end)}
                </p>
                <p className="mt-0.5 text-muted-foreground">Oy natijasi: {formatMoney(point.net, { sign: true })}</p>
              </div>
            );
          }}
        />
        <Area
          dataKey="end"
          type="monotone"
          stroke="var(--color-end)"
          strokeWidth={2}
          fill="var(--color-end)"
          fillOpacity={0.1}
          dot={data.length === 1 ? { r: 4, fill: "var(--color-end)", strokeWidth: 2, stroke: "var(--card)" } : false}
          activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--card)" }}
        />
      </AreaChart>
    </ChartContainer>
  );
}
