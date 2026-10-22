import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type Tone = "income" | "expense" | "debt" | "receivable" | "primary";

export const TONE_CLASSES: Record<Tone, string> = {
  income: "bg-income/10 text-income",
  expense: "bg-expense/10 text-expense",
  debt: "bg-debt/10 text-debt",
  receivable: "bg-receivable/10 text-receivable",
  primary: "bg-primary/10 text-primary",
};

/**
 * Asosiy ko'rsatkich kartochkasi. change — o'tgan oyga nisbatan foiz;
 * upIsGood=false bo'lsa (masalan chiqim) o'sish qizil ko'rsatiladi.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  change,
  upIsGood = true,
  hint,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: Tone;
  change?: number | null;
  upIsGood?: boolean;
  hint?: string;
}) {
  const hasChange = typeof change === "number" && Number.isFinite(change);
  const isUp = hasChange && change > 0;
  const isGood = hasChange && (change === 0 || isUp === upIsGood);

  return (
    <Card className="gap-0 py-5">
      <CardContent className="space-y-3 px-5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
          <div className={cn("flex size-9 items-center justify-center rounded-lg", TONE_CLASSES[tone])}>
            <Icon className="size-4.5" />
          </div>
        </div>
        <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
        <div className="flex min-h-5 items-center gap-2 text-xs text-muted-foreground">
          {hasChange && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium tabular-nums",
                isGood ? "bg-income/10 text-income" : "bg-expense/10 text-expense",
              )}
            >
              {isUp ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
              {Math.abs(change).toFixed(1).replace(".", ",")}%
            </span>
          )}
          {hint && <span className="truncate">{hint}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
