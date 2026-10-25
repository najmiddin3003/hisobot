"use client";

import { createElement, useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";

export type ComboOption = {
  value: string;
  label: string;
  /** Guruh sarlavhasi (masalan "Chiqim" / "Kirim") */
  group?: string;
  /** Kategoriya/hamyon ikonkasi va rangi */
  icon?: string;
  color?: string;
};

/** Qidirishda katta-kichik harf va tutuq belgisi (o', g', ʻ) farq qilmaydi */
const normalize = (s: string) => s.toLowerCase().replace(/['ʻʼ‘’`]/g, "");

function OptionIcon({ option }: { option: ComboOption }) {
  if (!option.icon) return null;
  return (
    <span
      className="flex size-6 shrink-0 items-center justify-center rounded-lg"
      style={option.color ? { backgroundColor: `${option.color}1f`, color: option.color } : undefined}
    >
      {createElement(getIcon(option.icon), { className: "size-3.5" })}
    </span>
  );
}

/**
 * Qidiruvli ro'yxat (select o'rniga): ochilganda qidiruv maydoni, ↑/↓ va Enter bilan tanlash,
 * guruhlar, ikonkalar. Ko'p kategoriya bo'lsa ham tez topiladi.
 */
export function Combobox({
  value,
  onChange,
  options,
  placeholder = "Tanlang",
  searchPlaceholder = "Qidirish...",
  emptyText = "Hech narsa topilmadi",
  disabled,
  className,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: ComboOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return q ? options.filter((o) => normalize(o.label).includes(q)) : options;
  }, [options, query]);

  // Klaviatura bilan tanlangan qator ko'rinib tursin
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const choose = (option: ComboOption) => {
    onChange(option.value);
    setOpen(false);
  };

  const openChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setQuery("");
      setActive(Math.max(options.findIndex((o) => o.value === value), 0));
    }
  };

  return (
    <Popover open={open} onOpenChange={openChange}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-label={ariaLabel}
          className={cn(
            "group/combo flex h-9 w-full min-w-0 items-center gap-2 rounded-xl border border-input bg-card/60 pr-2.5 pl-3 text-left text-sm transition-[color,border-color,box-shadow] duration-200 outline-none hover:border-ring/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[state=open]:border-ring data-[state=open]:ring-3 data-[state=open]:ring-ring/25",
            selected?.icon && "pl-1.5",
            className,
          )}
        >
          {selected && <OptionIcon option={selected} />}
          <span className={cn("min-w-0 flex-1 truncate", !selected && "text-muted-foreground")}>
            {selected?.label ?? placeholder}
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]/combo:rotate-180" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-64 gap-1 p-1.5">
        <div className="flex items-center gap-2 rounded-xl bg-muted px-2.5">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => Math.min(i + 1, filtered.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                if (filtered[active]) choose(filtered[active]);
              }
            }}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            aria-activedescendant={filtered[active] ? `${listId}-${active}` : undefined}
            className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div ref={listRef} id={listId} role="listbox" className="max-h-72 overflow-y-auto overscroll-contain py-0.5">
          {filtered.length === 0 && <p className="px-2.5 py-6 text-center text-sm text-muted-foreground">{emptyText}</p>}
          {filtered.map((option, index) => {
            // Guruh sarlavhasi faqat guruh o'zgargan joyda
            const heading = option.group && option.group !== filtered[index - 1]?.group ? option.group : null;
            const isSelected = option.value === value;
            return (
              <div key={option.value}>
                {heading && <p className="px-2.5 pt-2.5 pb-1 text-xs text-muted-foreground">{heading}</p>}
                <div
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  data-index={index}
                  onPointerMove={() => setActive(index)}
                  onClick={() => choose(option)}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors",
                    option.icon && "pl-1.5",
                    index === active && "bg-accent text-accent-foreground",
                  )}
                >
                  <OptionIcon option={option} />
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  {isSelected && <Check className="size-4 shrink-0" />}
                </div>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
