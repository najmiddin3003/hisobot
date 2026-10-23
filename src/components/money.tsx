import { formatAmount } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * Katta summa: serif raqamlar, "so'm" kichikroq va xiraroq. Rang (masalan text-income)
 * tashqaridan beriladi — birlik ham shu rangda, faqat shaffofroq.
 */
export function Money({ amount, sign = false, className }: { amount: number; sign?: boolean; className?: string }) {
  const prefix = amount < 0 ? "−" : sign && amount > 0 ? "+" : "";
  return (
    <span className={cn("money-display whitespace-nowrap", className)}>
      {prefix}
      {formatAmount(amount)}
      <span className="ml-[0.25em] font-sans text-[max(0.45em,0.75rem)] font-medium tracking-normal opacity-60">so&apos;m</span>
    </span>
  );
}
