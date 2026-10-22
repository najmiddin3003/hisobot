import Link from "next/link";
import { CalendarCheck, HandCoins, Handshake, Landmark } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Dashboard } from "@/lib/data/dashboard";
import { formatDate } from "@/lib/dates";
import { daysText } from "@/lib/debts";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

/** Qarz va xaq qoldig'i hamda yaqin 30 kundagi to'lovlar (tor ustunga moslangan) */
export function DebtsSummary({ data, className }: { data: Dashboard; className?: string }) {
  const { owe, owed, upcoming } = data.debts;
  const totals = [
    { href: "/qarzlar", label: "Men qarzdorman", value: owe, className: "bg-debt/10 hover:bg-debt/15" },
    { href: "/xaq", label: "Menga qarzdor", value: owed, className: "bg-receivable/10 hover:bg-receivable/15" },
  ];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Qarz va xaq</CardTitle>
        <CardDescription>Yaqin 30 kundagi to&apos;lovlar</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {totals.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={cn("flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 transition-colors", t.className)}
            >
              <span className="text-sm text-muted-foreground">{t.label}</span>
              <span className="font-semibold">{formatMoney(t.value)}</span>
            </Link>
          ))}
        </div>

        {upcoming.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground">
            <CalendarCheck className="size-4" /> Yaqin 30 kunda to&apos;lov yo&apos;q
          </div>
        ) : (
          <div className="divide-y rounded-lg border">
            {upcoming.slice(0, 5).map((item) => {
              const Icon = item.kind === "kredit" ? Landmark : item.direction === "olingan" ? HandCoins : Handshake;
              return (
                <Link
                  key={item.id}
                  href={item.direction === "olingan" ? "/qarzlar" : "/xaq"}
                  className="flex items-start gap-3 px-3 py-2.5 transition-colors hover:bg-muted/50"
                >
                  <Icon
                    className={cn(
                      "mt-0.5 size-4 shrink-0",
                      item.direction === "olingan" ? "text-debt" : "text-receivable",
                    )}
                  />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-medium">{item.counterparty}</span>
                      <span className="shrink-0 text-sm font-semibold">{formatMoney(item.amount)}</span>
                    </div>
                    <p className={cn("text-xs", item.overdue ? "font-medium text-expense" : "text-muted-foreground")}>
                      {formatDate(new Date(item.nextDue))} · {daysText(item.daysToDue)} ·{" "}
                      {item.direction === "olingan" ? "to'lashim kerak" : "olishim kerak"}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
