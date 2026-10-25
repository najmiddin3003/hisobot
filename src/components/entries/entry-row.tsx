"use client";

import { createElement } from "react";
import { ArrowLeftRight, ArrowRight, HandCoins } from "lucide-react";
import { SourceBadge } from "@/components/entries/source-badge";
import { formatCurrency } from "@/lib/currency";
import { formatDateTime, formatTime } from "@/lib/dates";
import type { Entry } from "@/lib/entries";
import { getIcon } from "@/lib/icons";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * Bitta yozuv qatori. Kunlar bo'yicha guruhlangan ro'yxatda faqat vaqt ko'rinadi (sana — guruh
 * sarlavhasida); withDate bo'lsa (masalan Dashboard'da) to'liq sana-vaqt yoziladi.
 */
export function EntryRow({
  entry,
  onClick,
  withDate = false,
  compact = false,
  className,
}: {
  entry: Entry;
  onClick?: () => void;
  withDate?: boolean;
  /** Tor ustun uchun ixcham ko'rinish */
  compact?: boolean;
  className?: string;
}) {
  const occurredAt = new Date(entry.occurredAt);
  const when = withDate ? formatDateTime(occurredAt) : formatTime(occurredAt);
  const isTx = entry.kind === "tx";

  const icon = isTx ? (
    <span
      className="flex size-10 shrink-0 items-center justify-center rounded-xl"
      style={{ backgroundColor: `${entry.category.color}1f`, color: entry.category.color }}
    >
      {createElement(getIcon(entry.category.icon), { className: "size-4.5" })}
    </span>
  ) : (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
      <ArrowLeftRight className="size-4.5" />
    </span>
  );

  const title = isTx ? (
    entry.category.name
  ) : (
    <span className="inline-flex items-center gap-1">
      {entry.fromWallet.name} <ArrowRight className="size-3.5 text-muted-foreground" /> {entry.toWallet.name}
    </span>
  );

  // Chet valyutali yozuv: asosiy summa o'z valyutasida, ostida taxminiy so'm (hisobotlar so'mda)
  const foreign = isTx && entry.currency !== "UZS" && entry.originalAmount !== null;
  const crossTransfer = !isTx && entry.fromWallet.currency !== entry.toWallet.currency;
  const signed = (value: number) => (isTx && entry.type === "chiqim" ? -value : value);

  const amount = (
    <span
      className={cn(
        "flex shrink-0 flex-col items-end text-right font-semibold tabular-nums",
        !isTx ? "text-muted-foreground" : entry.type === "kirim" ? "text-income" : "text-expense",
      )}
    >
      <span>
        {isTx
          ? formatCurrency(signed(foreign ? entry.originalAmount! : entry.amount), foreign ? entry.currency : "UZS", { sign: true })
          : formatCurrency(entry.amount, entry.fromWallet.currency)}
      </span>
      {foreign && (
        <span className="text-[11px] font-normal text-muted-foreground">≈ {formatMoney(entry.amount)}</span>
      )}
      {crossTransfer && (
        <span className="text-[11px] font-normal text-muted-foreground">
          → {formatCurrency(entry.toAmount, entry.toWallet.currency)}
        </span>
      )}
    </span>
  );

  const debtBadge = isTx && entry.debtId && (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-debt/10 px-2 py-0.5 text-[11px] font-medium text-debt">
      <HandCoins className="size-3" /> Qarz
    </span>
  );

  // Tor joylar uchun (masalan Dashboard'ning yon ustuni): yuqorida summa, ostida nom va sana bitta qatorda
  const compactContent = (
    <>
      {icon}
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex min-w-0 items-center gap-1.5">
          {amount}
          {debtBadge}
          <SourceBadge source={entry.source} className="shrink-0" />
        </div>
        <p className="truncate text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{title}</span>
          {" · "}
          <time dateTime={entry.occurredAt}>{when}</time>
          {isTx && ` · ${entry.wallet.name}`}
          {entry.note && ` · ${entry.note}`}
        </p>
      </div>
    </>
  );

  const content = compact ? compactContent : (
    <>
      {icon}
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium">{title}</span>
          {debtBadge}
          <SourceBadge source={entry.source} className="shrink-0" />
        </div>
        <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <time dateTime={entry.occurredAt} title={formatDateTime(occurredAt)} className="shrink-0 tabular-nums">
            {when}
          </time>
          {isTx && (
            <>
              <span aria-hidden>·</span>
              <span className="shrink-0">{entry.wallet.name}</span>
            </>
          )}
          {entry.note && (
            <>
              <span aria-hidden>·</span>
              <span className="truncate">{entry.note}</span>
            </>
          )}
        </p>
      </div>
      {amount}
    </>
  );

  const base = cn("flex w-full items-center gap-3 px-4 py-3 text-left", className);
  return onClick ? (
    <button type="button" onClick={onClick} className={cn(base, "transition-colors hover:bg-muted/50")}>
      {content}
    </button>
  ) : (
    <div className={base}>{content}</div>
  );
}
