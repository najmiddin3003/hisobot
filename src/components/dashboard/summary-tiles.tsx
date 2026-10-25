import Link from "next/link";
import { ArrowDownRight, ArrowRight, ArrowUpRight, CalendarCheck, HandCoins, Handshake, Landmark, Wallet } from "lucide-react";
import { ProgressRing, Sparkline } from "@/components/charts";
import { Money } from "@/components/money";
import { ChangePill } from "@/components/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import type { Dashboard } from "@/lib/data/dashboard";
import { formatDate } from "@/lib/dates";
import { daysText } from "@/lib/debts";
import { formatCompact, formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

/** Bosh blok — oy hikoyasi: natija katta raqamda, bir gaplik xulosa, tejash halqasi, kirim/chiqim trendlari */
export function MonthHero({ data, className }: { data: Dashboard; className?: string }) {
  const { income, expense, net } = data;
  const empty = income.value === 0 && expense.value === 0;
  const keptShare = income.value > 0 ? net.value / income.value : 0;
  const diff = net.value - net.previous;

  // Hikoya: asosiy gap va o'tgan oy bilan taqqoslash
  const headline = empty
    ? "Bu oyda hali yozuv yo'q"
    : net.value < 0
      ? `Chiqim kirimdan ${formatCompact(-net.value)} so'm ko'p bo'ldi`
      : income.value > 0
        ? `Bu oy kirimning ${Math.round(keptShare * 100)}% i qoldi`
        : "Kirim hali yo'q";
  const comparison = empty
    ? "Birinchi kirim yoki chiqimni qo'shing — hisob shu yerdan boshlanadi."
    : diff === 0
      ? `${data.prevLabel} bilan bir xil natija.`
      : `${data.prevLabel}ga nisbatan ${formatCompact(Math.abs(diff))} so'm ${diff > 0 ? "yaxshiroq" : "kamroq"}${diff > 0 && net.value > 0 ? " — zo'r!" : "."}`;

  return (
    <Card className={cn("justify-between gap-6", className)}>
      <CardContent className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-3">
          <p className="text-sm text-muted-foreground">
            {data.monthLabel} natijasi{data.isCurrentMonth && " · hozircha"}
          </p>
          <Money
            amount={net.value}
            sign
            className={cn("block text-[2.75rem] sm:text-6xl", net.value < 0 ? "text-expense" : "text-income")}
          />
          <div className="space-y-1">
            <p className="font-heading text-lg leading-snug font-medium">{headline}</p>
            <p className="text-sm text-muted-foreground">{comparison}</p>
          </div>
        </div>
        {!empty && income.value > 0 && (
          <ProgressRing
            value={net.value < 0 ? 1 : keptShare}
            size={96}
            stroke={9}
            label={net.value < 0 ? "Chiqim kirimdan oshdi" : `Kirimning ${Math.round(keptShare * 100)}% i qoldi`}
            className={cn("hidden sm:inline-flex", net.value < 0 ? "text-chart-expense" : "text-chart-income")}
            trackClassName="text-chart-expense/25"
          >
            <span className="font-heading text-xl font-medium text-foreground">
              {net.value < 0 ? "−" : `${Math.round(keptShare * 100)}%`}
            </span>
            <span className="block text-[11px] text-muted-foreground">{net.value < 0 ? "oshib ketdi" : "qoldi"}</span>
          </ProgressRing>
        )}
      </CardContent>

      <CardContent className="grid grid-cols-2 gap-4 border-t pt-5">
        <FlowStat
          label="Kirim"
          value={income.value}
          change={income.change}
          debt={income.debt}
          trend={data.trend.map((t) => t.income)}
          trendClassName="text-chart-income"
        />
        <FlowStat
          label="Chiqim"
          value={expense.value}
          change={expense.change}
          debt={expense.debt}
          upIsGood={false}
          trend={data.trend.map((t) => t.expense)}
          trendClassName="text-chart-expense"
        />
      </CardContent>
    </Card>
  );
}

function FlowStat({
  label,
  value,
  change,
  debt,
  upIsGood = true,
  trend,
  trendClassName,
}: {
  label: string;
  value: number;
  change: number | null;
  debt: number;
  upIsGood?: boolean;
  /** Oxirgi 12 oy — kichik trend chizig'i uchun */
  trend: number[];
  trendClassName: string;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        {label}
        {change !== null && <ChangePill change={change} upIsGood={upIsGood} />}
      </p>
      <Money amount={value} className="block truncate text-xl sm:text-2xl" />
      <Sparkline values={trend} className={trendClassName} label={`${label}: oxirgi 12 oy`} />
      {debt > 0 && <p className="truncate text-xs text-muted-foreground">shundan qarz/kredit: {formatMoney(debt)}</p>}
    </div>
  );
}

/** Zaytun rangli blok: barcha hamyonlardagi pul */
export function BudgetTile({ data, className }: { data: Dashboard; className?: string }) {
  const { budget } = data;
  return (
    <Card tone="olive" className={cn("justify-between", className)}>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
          Jami budjet
          <span className="flex size-8 items-center justify-center rounded-full bg-foreground/10 text-foreground">
            <Wallet className="size-4" />
          </span>
        </div>
        <Money amount={budget.value} className="block truncate text-3xl" />
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {budget.change !== null && Math.abs(budget.change) >= 0.05 && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-foreground/10 px-2 py-0.5 font-medium text-foreground tabular-nums">
              {budget.change > 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
              {Math.abs(budget.change).toFixed(1).replace(".", ",")}%
            </span>
          )}
          {data.isCurrentMonth ? "hozir, barcha hamyonlarda" : `${data.monthLabel} oxirida`}
        </p>
      </CardContent>
      <CardContent>
        <Link
          href="/budjet"
          className="inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline"
        >
          Hamyonlar <ArrowRight className="size-4" />
        </Link>
      </CardContent>
    </Card>
  );
}

/** Terrakota rangli blok: qarz va xaq qoldig'i hamda yaqin 30 kundagi to'lovlar */
export function DebtTile({ data, className }: { data: Dashboard; className?: string }) {
  const { owe, owed, upcoming } = data.debts;

  return (
    <Card tone="clay" className={cn("justify-between", className)}>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {[
            { href: "/qarzlar", label: "Men qarzdorman", value: owe },
            { href: "/xaq", label: "Menga qarzdor", value: owed },
          ].map((row) => (
            <Link key={row.href} href={row.href} className="group block min-w-0 space-y-0.5">
              <span className="block text-xs text-muted-foreground group-hover:underline">{row.label}</span>
              <Money amount={row.value} className="block truncate text-2xl" />
            </Link>
          ))}
        </div>

        {upcoming.length === 0 ? (
          <p className="flex items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
            <CalendarCheck className="size-4" /> Yaqin 30 kunda to&apos;lov yo&apos;q
          </p>
        ) : (
          <div className="space-y-2 border-t pt-3">
            <p className="text-xs text-muted-foreground">Yaqin to&apos;lovlar</p>
            {upcoming.slice(0, 3).map((item) => {
              const Icon = item.kind === "kredit" ? Landmark : item.direction === "olingan" ? HandCoins : Handshake;
              return (
                <Link
                  key={item.id}
                  href={item.direction === "olingan" ? "/qarzlar" : "/xaq"}
                  className="flex items-center gap-2.5 rounded-xl bg-foreground/[0.06] px-2.5 py-2 transition-colors hover:bg-foreground/10"
                >
                  {/* Halqa ichida ikonka: qancha qismi qaytarilgan */}
                  <ProgressRing value={item.progress} size={34} stroke={3.5} label={`${Math.round(item.progress * 100)}% qaytarilgan`}>
                    <Icon className="size-3.5" />
                  </ProgressRing>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-medium">{item.counterparty}</span>
                      {/* − to'lashim kerak, + olishim kerak */}
                      <span className="shrink-0 text-sm font-semibold tabular-nums">
                        {formatMoney(item.direction === "olingan" ? -item.amount : item.amount, { sign: true })}
                      </span>
                    </div>
                    <p
                      className={cn("truncate text-xs", item.overdue ? "font-semibold" : "text-muted-foreground")}
                      title={item.direction === "olingan" ? "To'lashim kerak" : "Olishim kerak"}
                    >
                      {formatDate(new Date(item.nextDue))} · {daysText(item.daysToDue)}
                    </p>
                  </div>
                </Link>
              );
            })}
            {upcoming.length > 3 && <p className="text-xs text-muted-foreground">Yana {upcoming.length - 3} ta to&apos;lov</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
