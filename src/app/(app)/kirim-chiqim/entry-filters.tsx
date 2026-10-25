"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import { ActivePill } from "@/components/motion/active-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SOURCE_LABELS, SOURCES } from "@/lib/domain";
import { FILTER_PARAMS, type EntryFilters, type EntryOptions } from "@/lib/entries";
import { cn } from "@/lib/utils";

const ALL = "hammasi";

const TYPE_TABS = [
  { value: undefined, label: "Hammasi" },
  { value: "kirim", label: "Kirim" },
  { value: "chiqim", label: "Chiqim" },
  { value: "otkazma", label: "O'tkazma" },
] as const;

/** Filtrlar URL'da saqlanadi — sahifani yangilasa yoki havolani ochsa ham saqlanib qoladi */
export function EntryFilterBar({
  filters,
  options,
  onPendingChange,
}: {
  filters: EntryFilters;
  options: EntryOptions;
  onPendingChange: (pending: boolean) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(filters.q ?? "");

  useEffect(() => onPendingChange(pending), [pending, onPendingChange]);

  const update = (changes: Partial<Record<keyof EntryFilters, string | undefined>>) => {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes) as [keyof EntryFilters, string | undefined][]) {
      if (value) params.set(FILTER_PARAMS[key], value);
      else params.delete(FILTER_PARAMS[key]);
    }
    const qs = params.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };

  // Qidiruv yozib bo'lingandan 400 ms keyin ishga tushadi
  useEffect(() => {
    if ((filters.q ?? "") === query.trim()) return;
    const timer = setTimeout(() => update({ q: query.trim() || undefined }), 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- faqat matn o'zgarganda
  }, [query]);

  const active = Object.values(filters).some(Boolean);
  const expenseCategories = options.categories.filter((c) => c.type === "chiqim");
  const incomeCategories = options.categories.filter((c) => c.type === "kirim");

  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
      <div className="flex shrink-0 gap-1 overflow-x-auto rounded-full bg-muted p-1">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => update({ type: tab.value, categoryId: tab.value === "otkazma" ? undefined : filters.categoryId })}
            className={cn(
              "relative shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors duration-200",
              filters.type === tab.value ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {filters.type === tab.value && <ActivePill layoutId="entry-type-filter" className="bg-card shadow-sm" />}
            <span className="relative">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="grid flex-1 grid-cols-2 gap-2 xl:grid-cols-4">
        <Combobox
          aria-label="Kategoriya"
          value={filters.categoryId ?? ALL}
          onChange={(v) => update({ categoryId: v === ALL ? undefined : v })}
          disabled={filters.type === "otkazma"}
          searchPlaceholder="Kategoriya qidirish..."
          options={[
            { value: ALL, label: "Barcha kategoriyalar" },
            ...expenseCategories.map((c) => ({ value: c.id, label: c.name, group: "Chiqim", icon: c.icon, color: c.color })),
            ...incomeCategories.map((c) => ({ value: c.id, label: c.name, group: "Kirim", icon: c.icon, color: c.color })),
          ]}
        />

        <Combobox
          aria-label="Hamyon"
          value={filters.walletId ?? ALL}
          onChange={(v) => update({ walletId: v === ALL ? undefined : v })}
          searchPlaceholder="Hamyon qidirish..."
          options={[
            { value: ALL, label: "Barcha hamyonlar" },
            ...options.wallets.map((w) => ({ value: w.id, label: w.name, icon: w.icon, color: w.color })),
          ]}
        />

        <Select value={filters.source ?? ALL} onValueChange={(v) => update({ source: v === ALL ? undefined : v })}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Manba" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Barcha manbalar</SelectItem>
            {SOURCES.map((s) => (
              <SelectItem key={s} value={s}>
                {SOURCE_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative col-span-2 xl:col-span-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Izoh yoki kategoriya..."
            className="pl-8"
            aria-label="Qidiruv"
          />
        </div>
      </div>

      <div className="flex h-8 shrink-0 items-center gap-2">
        {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        {active && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQuery("");
              update({ type: undefined, categoryId: undefined, walletId: undefined, source: undefined, q: undefined });
            }}
          >
            <X /> Tozalash
          </Button>
        )}
      </div>
    </div>
  );
}
