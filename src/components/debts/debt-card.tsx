"use client";

import { createElement } from "react";
import { CalendarClock, CircleCheck, HandCoins, Handshake, Landmark, TriangleAlert } from "lucide-react";
import { DEBT_TEXT } from "@/components/debts/debt-text";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { DebtItem } from "@/lib/data/debts";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export function debtIcon(debt: Pick<DebtItem, "kind" | "direction">) {
  if (debt.kind === "kredit") return Landmark;
  return debt.direction === "olingan" ? HandCoins : Handshake;
}

/** "bugun", "14 kun qoldi", "3 kun o'tdi" */
export function daysText(days: number) {
  if (days === 0) return "bugun";
  return days > 0 ? `${days} kun qoldi` : `${-days} kun o'tdi`;
}

export function DebtProgress({ debt }: { debt: DebtItem }) {
  const percent = Math.round(debt.progress * 100);
  return (
    <div className="space-y-1.5">
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", debt.direction === "olingan" ? "bg-debt" : "bg-receivable")}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="flex justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {DEBT_TEXT[debt.direction].paidLabel}: {formatMoney(debt.paid)}
        </span>
        <span>
          {percent}% · jami {formatMoney(debt.total)}
        </span>
      </p>
    </div>
  );
}

export function DebtCard({ debt, onOpen, onPay }: { debt: DebtItem; onOpen: () => void; onPay: () => void }) {
  const text = DEBT_TEXT[debt.direction];
  const isCredit = debt.kind === "kredit";

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onOpen())}
      className={cn(
        "cursor-pointer transition-shadow hover:ring-foreground/20 focus-visible:ring-2 focus-visible:ring-ring",
        debt.overdue && "ring-expense/50",
        debt.closed && "opacity-75",
      )}
    >
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl",
              debt.direction === "olingan" ? "bg-debt/10 text-debt" : "bg-receivable/10 text-receivable",
            )}
          >
            {createElement(debtIcon(debt), { className: "size-5" })}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{debt.counterparty}</p>
            <p className="truncate text-xs text-muted-foreground">
              {isCredit
                ? `Kredit · oyiga ${formatMoney(debt.monthlyPayment ?? 0)}`
                : `${formatDate(new Date(debt.startedAt))} · ${formatMoney(debt.amount)}`}
            </p>
          </div>
          {debt.closed ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-income/10 px-1.5 py-0.5 text-xs font-medium text-income">
              <CircleCheck className="size-3.5" /> Yopilgan
            </span>
          ) : debt.overdue ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-expense/10 px-1.5 py-0.5 text-xs font-medium text-expense">
              <TriangleAlert className="size-3.5" /> Muddati o&apos;tgan
            </span>
          ) : null}
        </div>

        <div>
          <p className="text-xs text-muted-foreground">{debt.closed ? "Jami" : text.remainingLabel}</p>
          <p className="text-2xl font-semibold tracking-tight">{formatMoney(debt.closed ? debt.total : debt.remaining)}</p>
        </div>

        <DebtProgress debt={debt} />

        <div className="flex items-center justify-between gap-3">
          <p className={cn("flex min-w-0 items-center gap-1.5 text-xs", debt.overdue ? "text-expense" : "text-muted-foreground")}>
            <CalendarClock className="size-3.5 shrink-0" />
            <span className="truncate">
              {debt.closed
                ? `Yopilgan: ${debt.closedAt ? formatDate(new Date(debt.closedAt)) : "—"}`
                : debt.nextDue
                  ? `${isCredit ? "Keyingi to'lov" : "Muddat"}: ${formatDate(new Date(debt.nextDue))} (${daysText(debt.daysToDue ?? 0)})`
                  : "Muddat belgilanmagan"}
              {isCredit && !debt.closed && debt.remainingMonths !== null && ` · ${debt.remainingMonths} oy qoldi`}
            </span>
          </p>
          {!debt.closed && (
            <Button
              size="sm"
              variant="outline"
              className="shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onPay();
              }}
            >
              {text.payAction}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
