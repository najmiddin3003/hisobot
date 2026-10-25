"use client";

import { useState } from "react";
import { ArrowLeftRight, Minus, Plus } from "lucide-react";
import { EntryEditorProvider, useEntryEditor } from "@/components/entries/entry-editor";
import { AnimatePresence } from "motion/react";
import { EntryRow } from "@/components/entries/entry-row";
import { EmptyState as RichEmptyState, IllustrationReceipt, IllustrationSearch } from "@/components/illustrations";
import { Money } from "@/components/money";
import { Collapse } from "@/components/motion/collapse";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { DayGroup, EntryFilters, EntryOptions } from "@/lib/entries";
import { formatAmount, formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { EntryFilterBar } from "./entry-filters";

type Totals = { income: number; expense: number; net: number; count: number };

export function EntriesView(props: {
  groups: DayGroup[];
  totals: Totals;
  options: EntryOptions;
  filters: EntryFilters;
  filtered: boolean;
  shownCount: number;
}) {
  return (
    <EntryEditorProvider options={props.options}>
      <EntriesBody {...props} />
    </EntryEditorProvider>
  );
}

function EntriesBody({
  groups,
  totals,
  options,
  filters,
  filtered,
  shownCount,
}: Parameters<typeof EntriesView>[0]) {
  const editor = useEntryEditor();
  const [loading, setLoading] = useState(false);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <MonthTotals totals={totals} />
        <div className="grid grid-cols-3 gap-2 lg:w-44 lg:grid-cols-1">
          <Button className="bg-expense text-primary-foreground hover:bg-expense/85" onClick={() => editor.openNew("chiqim")}>
            <Minus /> Chiqim
          </Button>
          <Button className="bg-income text-primary-foreground hover:bg-income/85" onClick={() => editor.openNew("kirim")}>
            <Plus /> Kirim
          </Button>
          <Button variant="outline" onClick={() => editor.openNew("otkazma")}>
            <ArrowLeftRight /> O&apos;tkazma
          </Button>
        </div>
      </div>

      <EntryFilterBar filters={filters} options={options} onPendingChange={setLoading} />

      {/* Kunlar oralig'i pb-4 bilan (margin emas) — guruh yig'ilib yo'qolganda bo'shliq ham silliq yo'qoladi */}
      <div className={cn("stagger transition-opacity", loading && "pointer-events-none opacity-60")}>
        {filtered && groups.length > 0 && (
          <p className="pb-4 text-sm text-muted-foreground">Filtr bo&apos;yicha topildi: {shownCount} ta yozuv</p>
        )}

        <AnimatePresence initial={false}>
          {groups.map((group) => (
            <Collapse key={group.key} className="pb-4">
              <Card className="gap-0 py-0">
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b px-4 py-3">
                  <span className="font-heading text-base font-medium">{group.heading}</span>
                  <span className="flex gap-3 text-xs font-medium tabular-nums">
                    {group.income > 0 && <span className="text-income">+{formatAmount(group.income)}</span>}
                    {group.expense > 0 && <span className="text-expense">−{formatAmount(group.expense)}</span>}
                  </span>
                </div>
                <div className="divide-y">
                  <AnimatePresence initial={false}>
                    {group.entries.map((entry) => (
                      <Collapse key={`${entry.kind}-${entry.id}`}>
                        <EntryRow entry={entry} onClick={() => editor.openEdit(entry)} />
                      </Collapse>
                    ))}
                  </AnimatePresence>
                </div>
              </Card>
            </Collapse>
          ))}
        </AnimatePresence>

        {groups.length === 0 && <EmptyState filtered={filtered} onAdd={() => editor.openNew("chiqim")} />}
      </div>
    </div>
  );
}

function MonthTotals({ totals }: { totals: Totals }) {
  const items = [
    { label: "Kirim", amount: totals.income, sign: false, className: "text-income" },
    { label: "Chiqim", amount: totals.expense, sign: false, className: "text-expense" },
    { label: "Farq", amount: totals.net, sign: true, className: totals.net >= 0 ? "text-foreground" : "text-expense" },
  ];
  return (
    <Card className="grid grid-cols-1 gap-0 divide-y py-0 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      {items.map((item) => (
        // Telefonda qatorma-qator (nom chapda, summa o'ngda), kattaroq ekranda uch ustun
        <div key={item.label} className="flex min-w-0 items-baseline justify-between gap-3 px-4 py-3 sm:block sm:space-y-1.5 sm:py-5">
          <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
          <p className="truncate" title={formatMoney(item.amount, { sign: item.sign })}>
            <Money amount={item.amount} sign={item.sign} className={cn("text-xl sm:text-2xl xl:text-3xl", item.className)} />
          </p>
        </div>
      ))}
    </Card>
  );
}

function EmptyState({ filtered, onAdd }: { filtered: boolean; onAdd: () => void }) {
  return (
    <RichEmptyState
      illustration={filtered ? <IllustrationSearch /> : <IllustrationReceipt />}
      title={filtered ? "Hech narsa topilmadi" : "Bu oyda hali yozuv yo'q"}
      text={filtered ? "Filtrlarni o'zgartirib ko'ring" : "Birinchi kirim yoki chiqimni qo'shing"}
      action={
        !filtered && (
          <Button onClick={onAdd}>
            <Plus /> Yozuv qo&apos;shish
          </Button>
        )
      }
    />
  );
}
