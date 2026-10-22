"use client";

import { createElement } from "react";
import { getIcon } from "@/lib/icons";
import type { CategoryOption, WalletOption } from "@/lib/entries";
import { cn } from "@/lib/utils";

/** Kategoriyalar — rangli ikonkali bloklar to'ri */
export function CategoryPicker({
  categories,
  value,
  onChange,
}: {
  categories: CategoryOption[];
  value: string;
  onChange: (id: string) => void;
}) {
  if (categories.length === 0) {
    return <p className="text-sm text-muted-foreground">Kategoriyalar yo&apos;q — Sozlamalarda qo&apos;shing.</p>;
  }
  return (
    <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto p-0.5 sm:grid-cols-3">
      {categories.map((category) => {
        const selected = category.id === value;
        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onChange(category.id)}
            aria-pressed={selected}
            className={cn(
              "flex min-w-0 items-center gap-2 rounded-lg border p-2 text-left text-sm transition-colors hover:bg-muted/60",
              selected && "border-primary bg-primary/5 ring-2 ring-primary/30",
            )}
          >
            <span
              className="flex size-7 shrink-0 items-center justify-center rounded-md"
              style={{ backgroundColor: `${category.color}1f`, color: category.color }}
            >
              {createElement(getIcon(category.icon), { className: "size-3.5" })}
            </span>
            <span className="truncate font-medium">{category.name}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Hamyonlar — bir qatordagi tugmalar */
export function WalletPicker({
  wallets,
  value,
  onChange,
  disabledId,
}: {
  wallets: WalletOption[];
  value: string;
  onChange: (id: string) => void;
  /** O'tkazmada ikkinchi tomonda tanlangan hamyon */
  disabledId?: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {wallets.map((wallet) => {
        const selected = wallet.id === value;
        return (
          <button
            key={wallet.id}
            type="button"
            disabled={wallet.id === disabledId}
            onClick={() => onChange(wallet.id)}
            aria-pressed={selected}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/60 disabled:pointer-events-none disabled:opacity-40",
              selected && "border-primary bg-primary/5 ring-2 ring-primary/30",
            )}
          >
            <span style={{ color: wallet.color }}>{createElement(getIcon(wallet.icon), { className: "size-4" })}</span>
            {wallet.name}
          </button>
        );
      })}
    </div>
  );
}
