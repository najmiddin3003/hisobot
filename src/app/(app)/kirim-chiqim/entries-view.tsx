"use client";

import { useState } from "react";
import { ArrowLeftRight, FileSearch, Minus, Plus, ReceiptText } from "lucide-react";
import { EntryEditorProvider, useEntryEditor } from "@/components/entries/entry-editor";
import { EntryRow } from "@/components/entries/entry-row";
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
          <Button className="bg-expense text-white hover:bg-expense/85" onClick={() => editor.openNew("chiqim")}>
            <Minus /> Chiqim
          </Button>
          <Button className="bg-income text-white hover:bg-income/85" onClick={() => editor.openNew("kirim")}>
            <Plus /> Kirim
          </Button>
          <Button variant="outline" onClick={() => editor.openNew("otkazma")}>
            <ArrowLeftRight /> O&apos;tkazma
          </Button>
        </div>
      </div>

      <EntryFilterBar filters={filters} options={options} onPendingChange={setLoading} />

      <div className={cn("space-y-4 transition-opacity", loading && "pointer-events-none opacity-60")}>
        {filtered && groups.length > 0 && (
          <p className="text-sm text-muted-foreground">Filtr bo&apos;yicha topildi: {shownCount} ta yozuv</p>
        )}

        {groups.map((group) => (
          <Card key={group.key} className="gap-0 py-0">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b bg-muted/40 px-4 py-2.5">
              <span className="text-sm font-semibold">{group.heading}</span>
              <span className="flex gap-3 text-xs font-medium tabular-nums">
                {group.income > 0 && <span className="text-income">+{formatAmount(group.income)}</span>}
                {group.expense > 0 && <span className="text-expense">−{formatAmount(group.expense)}</span>}
              </span>
            </div>
            <div className="divide-y">
              {group.entries.map((entry) => (
                <EntryRow key={`${entry.kind}-${entry.id}`} entry={entry} onClick={() => editor.openEdit(entry)} />
              ))}
            </div>
          </Card>
        ))}

        {groups.length === 0 && <EmptyState filtered={filtered} onAdd={() => editor.openNew("chiqim")} />}
      </div>
    </div>
  );
}

function MonthTotals({ totals }: { totals: Totals }) {
  const items = [
    { label: "Kirim", value: formatMoney(totals.income), className: "text-income" },
    { label: "Chiqim", value: formatMoney(totals.expense), className: "text-expense" },
    {
      label: "Farq",
      value: formatMoney(totals.net, { sign: true }),
      className: totals.net >= 0 ? "text-foreground" : "text-expense",
    },
  ];
  return (
    <Card className="grid grid-cols-3 gap-0 divide-x py-0">
      {items.map((item) => (
        <div key={item.label} className="min-w-0 space-y-1 p-4">
          <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
          <p className={cn("truncate text-base font-semibold tabular-nums sm:text-xl", item.className)} title={item.value}>
            {item.value}
          </p>
        </div>
      ))}
    </Card>
  );
}

function EmptyState({ filtered, onAdd }: { filtered: boolean; onAdd: () => void }) {
  const Icon = filtered ? FileSearch : ReceiptText;
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="size-5" />
      </div>
      <div className="space-y-1">
        <p className="font-medium">{filtered ? "Hech narsa topilmadi" : "Bu oyda hali yozuv yo'q"}</p>
        <p className="text-sm text-muted-foreground">
          {filtered ? "Filtrlarni o'zgartirib ko'ring" : "Birinchi kirim yoki chiqimni qo'shing"}
        </p>
      </div>
      {!filtered && (
        <Button onClick={onAdd}>
          <Plus /> Yozuv qo&apos;shish
        </Button>
      )}
    </div>
  );
}
