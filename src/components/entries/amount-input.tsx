"use client";

import { useState } from "react";
import { CURRENCY_META, formatMinor, parseMinor, type Currency } from "@/lib/currency";
import { cn } from "@/lib/utils";

const NBSP = " ";

/**
 * Yozilayotgan matnni chiroyli ko'rinishga keltiradi: butun qism guruhlanadi ("1 250"),
 * kasr qismi valyuta xonasigacha qoladi; yozilayotgan vergul ham ko'rinib turadi ("12,").
 */
function liveFormat(raw: string, currency: Currency) {
  const { decimals } = CURRENCY_META[currency];
  const cleaned = raw.replace(/[^\d.,]/g, "");
  const sep = decimals > 0 ? Math.max(cleaned.lastIndexOf(","), cleaned.lastIndexOf(".")) : -1;
  const whole = (sep >= 0 ? cleaned.slice(0, sep) : cleaned).replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 13);
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  if (sep < 0) return grouped;
  const fraction = cleaned.slice(sep + 1).replace(/\D/g, "").slice(0, decimals);
  return `${grouped || "0"},${fraction}`;
}

/**
 * Katta summa maydoni. value — valyutaning eng kichik birligida (so'm, sent, satoshi).
 * So'mda butun son ("1 250 000"), dollar/yevro/USDT da 2 xona, bitkoinda 8 xonagacha kasr.
 */
export function AmountInput({
  value,
  onChange,
  currency = "UZS",
  id,
  autoFocus,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  currency?: Currency;
  id?: string;
  autoFocus?: boolean;
  className?: string;
}) {
  // Yozish paytida foydalanuvchi matni saqlanadi (masalan "12," — vergul yo'qolib qolmasin)
  const [draft, setDraft] = useState<string | null>(null);
  const meta = CURRENCY_META[currency];
  const shown = draft ?? (value ? formatMinor(value, currency) : "");

  return (
    <div
      className={cn(
        "flex items-baseline gap-2 rounded-xl border bg-muted/30 px-4 py-3 transition-[border-color,box-shadow] duration-200 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30",
        className,
      )}
    >
      <input
        id={id}
        inputMode={meta.decimals > 0 ? "decimal" : "numeric"}
        autoComplete="off"
        autoFocus={autoFocus}
        placeholder="0"
        value={shown}
        onChange={(e) => {
          const text = liveFormat(e.target.value, currency);
          setDraft(meta.decimals > 0 ? text : null);
          onChange(parseMinor(text, currency));
        }}
        onBlur={() => setDraft(null)}
        className="w-full min-w-0 bg-transparent text-3xl font-semibold tracking-tight tabular-nums outline-none placeholder:text-muted-foreground/50"
      />
      <span className="shrink-0 text-lg font-medium text-muted-foreground">{meta.symbol}</span>
    </div>
  );
}
