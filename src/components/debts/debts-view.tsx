"use client";

import { useRef, useState } from "react";
import { CalendarClock, ChevronDown, HandCoins, Handshake, Landmark, Plus, TriangleAlert, Users } from "lucide-react";
import { DebtCard } from "@/components/debts/debt-card";
import { DebtDetails } from "@/components/debts/debt-details";
import { DebtForm } from "@/components/debts/debt-form";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { DebtItem, DebtsPage } from "@/lib/data/debts";
import { formatDate, toDateTimeInput } from "@/lib/dates";
import type { DebtDirection, DebtKind } from "@/lib/domain";
import { formatMoney } from "@/lib/money";

type ModalTarget = { type: "form"; debt: DebtItem | null; kind: DebtKind } | { type: "details"; id: string };
/** now — oyna ochilgan vaqt (forma uchun), key — har ochilishda forma holatini yangilash uchun */
type Modal = ModalTarget & { now: string; key: number };

export function DebtsView({ direction, data }: { direction: DebtDirection; data: DebtsPage }) {
  const [modal, setModal] = useState<Modal | null>(null);
  const [open, setOpen] = useState(false);
  const counter = useRef(0);

  const show = (target: ModalTarget) => {
    counter.current += 1;
    setModal({ ...target, now: toDateTimeInput(new Date()), key: counter.current });
    setOpen(true);
  };
  const newDebt = (kind: DebtKind) => show({ type: "form", debt: null, kind });
  const details = (id: string) => show({ type: "details", id });

  const openItems = data.items.filter((d) => !d.closed);
  const closedItems = data.items.filter((d) => d.closed);
  // Oyna ochiq turganda ma'lumot yangilansa ham eng so'nggi holat ko'rinadi
  const selected = modal?.type === "details" ? data.items.find((d) => d.id === modal.id) : undefined;

  const sections =
    direction === "olingan"
      ? [
          { title: "Odamlardan olingan qarzlar", kind: "shaxs" as const, icon: HandCoins, add: "Qarz oldim" },
          { title: "Kreditlar", kind: "kredit" as const, icon: Landmark, add: "Kredit oldim" },
        ]
      : [{ title: "Bergan qarzlarim", kind: "shaxs" as const, icon: Handshake, add: "Qarz berdim" }];

  return (
    <div className="space-y-8">
      <Summary direction={direction} items={openItems} />

      <div className="flex flex-wrap gap-2">
        {sections.map((s) => (
          <Button
            key={s.kind}
            onClick={() => newDebt(s.kind)}
            className={direction === "olingan" ? "bg-debt text-white hover:bg-debt/85" : "bg-receivable text-white hover:bg-receivable/85"}
          >
            <Plus /> {s.add}
          </Button>
        ))}
      </div>

      {sections.map((section) => {
        const items = openItems.filter((d) => d.kind === section.kind);
        return (
          <section key={section.kind} className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              <section.icon className="size-4" /> {section.title}
              <span className="font-normal normal-case">· {items.length} ta ochiq</span>
            </h2>
            {items.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((debt) => (
                  <DebtCard key={debt.id} debt={debt} onOpen={() => details(debt.id)} onPay={() => details(debt.id)} />
                ))}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => newDebt(section.kind)}
                className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground transition-colors hover:bg-muted/40"
              >
                <section.icon className="size-6" />
                {section.kind === "kredit"
                  ? "Ochiq kredit yo'q"
                  : direction === "olingan"
                    ? "Hech kimdan qarzingiz yo'q"
                    : "Hech kim sizdan qarzdor emas"}
                <span className="font-medium text-primary">+ {section.add}</span>
              </button>
            )}
          </section>
        );
      })}

      {closedItems.length > 0 && (
        <details className="group space-y-3">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-muted-foreground">
            <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
            Yopilganlar ({closedItems.length})
          </summary>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {closedItems.map((debt) => (
              <DebtCard key={debt.id} debt={debt} onOpen={() => details(debt.id)} onPay={() => details(debt.id)} />
            ))}
          </div>
        </details>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-lg">
          {modal?.type === "form" && (
            <DebtForm
              key={modal.key}
              direction={direction}
              initialKind={modal.kind}
              debt={modal.debt}
              wallets={data.wallets}
              now={modal.now}
              onDone={() => (modal.debt ? details(modal.debt.id) : setOpen(false))}
            />
          )}
          {modal?.type === "details" && selected && (
            <DebtDetails
              key={modal.key}
              debt={selected}
              wallets={data.wallets}
              now={modal.now}
              onEdit={() => show({ type: "form", debt: selected, kind: selected.kind })}
              onClose={() => setOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Summary({ direction, items }: { direction: DebtDirection; items: DebtItem[] }) {
  const remaining = items.reduce((sum, d) => sum + d.remaining, 0);
  const overdue = items.filter((d) => d.overdue);
  const nearest = items
    .filter((d) => d.nextDue && !d.overdue)
    .sort((a, b) => (a.daysToDue ?? 0) - (b.daysToDue ?? 0))[0];
  const nearestAmount = nearest
    ? nearest.kind === "kredit"
      ? Math.min(nearest.monthlyPayment ?? 0, nearest.remaining)
      : nearest.remaining
    : 0;
  const monthlyCredits = items.filter((d) => d.kind === "kredit").reduce((sum, d) => sum + (d.monthlyPayment ?? 0), 0);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label={direction === "olingan" ? "Qaytarishim kerak" : "Menga qaytarishi kerak"}
        value={formatMoney(remaining)}
        icon={direction === "olingan" ? HandCoins : Handshake}
        tone={direction === "olingan" ? "debt" : "receivable"}
        hint={`${items.length} ta ochiq`}
      />
      {direction === "olingan" ? (
        <StatCard
          label="Kreditlar: har oy"
          value={formatMoney(monthlyCredits)}
          icon={Landmark}
          tone="primary"
          hint={`${items.filter((d) => d.kind === "kredit").length} ta kredit`}
        />
      ) : (
        <StatCard
          label="Qarzdorlar"
          value={`${new Set(items.map((d) => d.counterparty.toLowerCase())).size} kishi`}
          icon={Users}
          tone="primary"
        />
      )}
      <StatCard
        label="Eng yaqin muddat"
        value={nearest ? formatMoney(nearestAmount) : "—"}
        icon={CalendarClock}
        tone="income"
        hint={nearest?.nextDue ? `${formatDate(new Date(nearest.nextDue))} · ${nearest.counterparty}` : "Muddat yo'q"}
      />
      <StatCard
        label="Muddati o'tgan"
        value={`${overdue.length} ta`}
        icon={TriangleAlert}
        tone="expense"
        hint={overdue.length ? formatMoney(overdue.reduce((sum, d) => sum + d.remaining, 0)) : "Hammasi joyida"}
      />
    </div>
  );
}
