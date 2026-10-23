import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent, type CardTone } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type Tone = "income" | "expense" | "debt" | "receivable" | "primary";

export const TONE_CLASSES: Record<Tone, string> = {
  income: "bg-income/10 text-income",
  expense: "bg-expense/10 text-expense",
  debt: "bg-debt/10 text-debt",
  receivable: "bg-receivable/10 text-receivable",
  primary: "bg-foreground/[0.07] text-foreground",
};

/** O'tgan oyga nisbatan o'zgarish: upIsGood=false bo'lsa (masalan chiqim) o'sish qizil ko'rsatiladi */
export function ChangePill({ change, upIsGood = true }: { change: number; upIsGood?: boolean }) {
  const isUp = change > 0;
  const isFlat = Math.abs(change) < 0.05;
  const isGood = isUp === upIsGood;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 font-medium tabular-nums",
        isFlat ? "bg-muted text-muted-foreground" : isGood ? "bg-income/12 text-income" : "bg-expense/12 text-expense",
      )}
    >
      {isFlat ? null : isUp ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
      {Math.abs(change).toFixed(1).replace(".", ",")}%
    </span>
  );
}

/** Asosiy ko'rsatkich bloki: nom, katta serif qiymat, o'zgarish va izoh */
export function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  surface = "default",
  change,
  upIsGood = true,
  hint,
  detail,
  className,
}: {
  label: string;
  /** Odatda <Money />; matn ham bo'lishi mumkin ("3 kishi") */
  value: React.ReactNode;
  icon: LucideIcon;
  tone: Tone;
  /** Blok rangi (bento): oddiy yoki olive/clay/sand */
  surface?: CardTone;
  change?: number | null;
  upIsGood?: boolean;
  hint?: string;
  /** Qo'shimcha izoh, masalan "shundan qarz/kredit: 3 000 000 so'm" */
  detail?: string;
  className?: string;
}) {
  const hasChange = typeof change === "number" && Number.isFinite(change);

  return (
    <Card tone={surface} className={cn("gap-0 py-5", className)}>
      <CardContent className="flex h-full flex-col gap-3 px-5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full",
              surface === "default" ? TONE_CLASSES[tone] : "bg-foreground/10 text-foreground",
            )}
          >
            <Icon className="size-4" />
          </span>
        </div>
        <p className="money-display truncate text-[1.75rem]">{value}</p>
        <div className="mt-auto flex min-h-5 items-center gap-2 text-xs text-muted-foreground">
          {hasChange && <ChangePill change={change} upIsGood={upIsGood} />}
          {hint && <span className="truncate">{hint}</span>}
        </div>
        {detail && <p className="border-t pt-2.5 text-xs text-muted-foreground">{detail}</p>}
      </CardContent>
    </Card>
  );
}
