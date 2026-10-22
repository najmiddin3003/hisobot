"use client";

import { formatAmount } from "@/lib/money";
import { cn } from "@/lib/utils";

/** Katta summa maydoni: yozilayotganda "1 250 000" ko'rinishida guruhlanadi */
export function AmountInput({
  value,
  onChange,
  id,
  autoFocus,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  id?: string;
  autoFocus?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline gap-2 rounded-xl border bg-muted/30 px-4 py-3 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30",
        className,
      )}
    >
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        autoFocus={autoFocus}
        placeholder="0"
        value={value ? formatAmount(value) : ""}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 13);
          onChange(digits ? Number(digits) : 0);
        }}
        className="w-full min-w-0 bg-transparent text-3xl font-semibold tracking-tight tabular-nums outline-none placeholder:text-muted-foreground/50"
      />
      <span className="shrink-0 text-lg font-medium text-muted-foreground">so&apos;m</span>
    </div>
  );
}
