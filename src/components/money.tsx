"use client";

import { useEffect, useRef, useState } from "react";
import { CURRENCY_META, formatMinor, type Currency } from "@/lib/currency";
import { cn } from "@/lib/utils";

const ROLL_MS = 700;

/**
 * Qiymat o'zgarganda (oy almashsa, yozuv qo'shilsa) eski sondan yangisiga sanab o'tadi.
 * Birinchi chizishda darhol yakuniy qiymat — server va brauzer HTML'i bir xil, sakrash yo'q.
 */
function useRollingNumber(target: number) {
  const [shown, setShown] = useState(target);
  const shownRef = useRef(target);

  useEffect(() => {
    const from = shownRef.current;
    if (from === target) return;
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : ROLL_MS;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = duration === 0 ? 1 : Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - progress) ** 4;
      const value = Math.round(from + (target - from) * eased);
      shownRef.current = value;
      setShown(value);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return shown;
}

/**
 * Katta summa: serif raqamlar, birlik ("so'm", "$", "BTC") kichikroq va xiraroq. Rang (masalan text-income)
 * tashqaridan beriladi — birlik ham shu rangda, faqat shaffofroq. amount — valyutaning eng kichik birligida.
 */
export function Money({
  amount,
  currency = "UZS",
  sign = false,
  className,
}: {
  amount: number;
  currency?: Currency;
  sign?: boolean;
  className?: string;
}) {
  const shown = useRollingNumber(amount);
  const prefix = shown < 0 ? "−" : sign && shown > 0 ? "+" : "";
  return (
    <span className={cn("money-display whitespace-nowrap", className)}>
      {prefix}
      {formatMinor(shown, currency)}
      <span className="ml-[0.25em] font-sans text-[max(0.45em,0.75rem)] font-medium tracking-normal opacity-60">
        {CURRENCY_META[currency].symbol}
      </span>
    </span>
  );
}
