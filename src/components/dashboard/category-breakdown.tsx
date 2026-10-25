import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, PieChart } from "lucide-react";
import { ColorIcon } from "@/components/color-icon";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Dashboard } from "@/lib/data/dashboard";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

const VISIBLE = 8;

/**
 * Chiqim kategoriyalar bo'yicha: tartiblangan bloklar, ulush chizig'i va o'tgan oyga nisbatan o'zgarish.
 * Kategoriyalar ko'p bo'lgani uchun doira diagramma o'rniga — chiziqlar uzunligini solishtirish osonroq.
 */
export function CategoryBreakdown({ data, className }: { data: Dashboard; className?: string }) {
  const rows = data.categories.slice(0, VISIBLE);
  const rest = data.categories.slice(VISIBLE);
  const restTotal = rest.reduce((sum, r) => sum + r.amount, 0);
  const max = rows[0]?.amount ?? 0;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Xarajatlar kategoriyalar bo&apos;yicha</CardTitle>
        <CardDescription>
          {data.monthLabel} · jami {formatMoney(data.expense.value)}
        </CardDescription>
        <CardAction>
          <Link href="/kirim-chiqim?tur=chiqim" className="text-sm font-medium underline-offset-4 hover:underline">
            Barchasi
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
            <PieChart className="size-6" />
            Bu oyda hali chiqim yo&apos;q
          </div>
        ) : (
          <div className="space-y-3.5">
            {rows.map((row) => (
              <Link
                key={row.id}
                href={`/kirim-chiqim?kategoriya=${row.id}${data.isCurrentMonth ? "" : `&oy=${data.month}`}`}
                className="group flex items-center gap-3"
              >
                <ColorIcon icon={row.icon} color={row.color} className="size-9" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate font-medium group-hover:underline">{row.name}</span>
                    <span className="shrink-0 font-semibold">{formatMoney(row.amount)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Bitta rang (chiqim) — uzunlik miqdorni bildiradi; kategoriya ikonkasi o'z rangida */}
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="bar-grow h-full rounded-full bg-chart-expense"
                        style={{ width: `${max > 0 ? (row.amount / max) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="w-9 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                      {Math.round(row.share * 100)}%
                    </span>
                    <ChangeTag change={row.change} />
                  </div>
                </div>
              </Link>
            ))}
            {rest.length > 0 && (
              <p className="pl-12 text-xs text-muted-foreground">
                Yana {rest.length} ta kategoriya: {formatMoney(restTotal)}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Chiqim o'sgani — yomon (qizil), kamaygani — yaxshi (yashil) */
function ChangeTag({ change }: { change: number | null }) {
  if (change === null || !Number.isFinite(change)) {
    return <span className="w-16 shrink-0 text-right text-[11px] text-muted-foreground">yangi</span>;
  }
  if (Math.abs(change) < 0.5) {
    return <span className="w-16 shrink-0 text-right text-[11px] text-muted-foreground tabular-nums">0%</span>;
  }
  const up = change > 0;
  return (
    <span
      title="O'tgan oyga nisbatan"
      className={cn(
        "inline-flex w-16 shrink-0 items-center justify-end gap-0.5 text-[11px] font-medium tabular-nums",
        up ? "text-expense" : "text-income",
      )}
    >
      {up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
      {Math.abs(change) >= 1000 ? ">999" : Math.round(Math.abs(change))}%
    </span>
  );
}
