"use client";

import { createElement, useState, useTransition } from "react";
import { CircleAlert, Clock, Loader2, Lock, LockOpen, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { addDebtPayment, deleteDebt, deleteDebtPayment, setDebtClosed } from "@/app/(app)/qarzlar/actions";
import { daysText, debtIcon, DebtProgress } from "@/components/debts/debt-card";
import { DEBT_TEXT } from "@/components/debts/debt-text";
import { AmountInput } from "@/components/entries/amount-input";
import { WalletPicker } from "@/components/entries/option-pickers";
import { SourceBadge } from "@/components/entries/source-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DebtItem } from "@/lib/data/debts";
import { formatDate, formatDateTime, toDateTimeInput } from "@/lib/dates";
import type { WalletOption } from "@/lib/entries";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

/** Qarz kartochkasi ochilganda: holat, to'lov qo'shish, to'lovlar tarixi va amallar */
export function DebtDetails({
  debt,
  wallets,
  now,
  onEdit,
  onClose,
}: {
  debt: DebtItem;
  wallets: WalletOption[];
  now: string;
  onEdit: () => void;
  onClose: () => void;
}) {
  const text = DEBT_TEXT[debt.direction];
  const isCredit = debt.kind === "kredit";
  const [pending, startTransition] = useTransition();

  const run = (action: () => Promise<{ ok: boolean; error?: string }>, success: string, after?: () => void) =>
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error ?? "Xatolik");
        return;
      }
      toast.success(success);
      after?.();
    });

  const stats = [
    { label: "Jami", value: formatMoney(debt.total) },
    { label: text.paidLabel, value: formatMoney(debt.paid) },
    { label: "Qolgan", value: formatMoney(debt.remaining), strong: true },
  ];

  return (
    <div className="space-y-5">
      <DialogHeader>
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl",
              debt.direction === "olingan" ? "bg-debt/10 text-debt" : "bg-receivable/10 text-receivable",
            )}
          >
            {createElement(debtIcon(debt), { className: "size-5" })}
          </span>
          <div className="min-w-0 text-left">
            <DialogTitle className="truncate">{debt.counterparty}</DialogTitle>
            <DialogDescription>
              {isCredit ? "Kredit" : debt.direction === "olingan" ? "Men olgan qarz" : "Men bergan qarz"} ·{" "}
              {formatDateTime(new Date(debt.startedAt))}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="grid grid-cols-3 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="min-w-0 rounded-lg bg-muted/50 p-2.5">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={cn("truncate text-sm", s.strong && "font-semibold")} title={s.value}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <DebtProgress debt={debt} />

      {!debt.closed && (debt.nextDue || isCredit) && (
        <div
          className={cn(
            "flex flex-wrap gap-x-4 gap-y-1 rounded-lg border px-3 py-2 text-sm",
            debt.overdue && "border-expense/40 bg-expense/5 text-expense",
          )}
        >
          {debt.nextDue && (
            <span>
              {isCredit ? "Keyingi to'lov" : "Qaytarish muddati"}: <b>{formatDate(new Date(debt.nextDue))}</b> (
              {daysText(debt.daysToDue ?? 0)})
            </span>
          )}
          {isCredit && (
            <span className="text-muted-foreground">
              Oyiga {formatMoney(debt.monthlyPayment ?? 0)} · {debt.remainingMonths ?? "—"} oy qoldi
            </span>
          )}
        </div>
      )}

      {debt.note && <p className="rounded-lg bg-muted/40 px-3 py-2 text-sm text-muted-foreground">{debt.note}</p>}

      {!debt.closed && <PaymentForm debt={debt} wallets={wallets} now={now} />}

      <div className="space-y-2">
        <p className="text-sm font-semibold">{text.paymentsTitle}</p>
        <div className="divide-y rounded-xl border">
          {debt.payments.map((payment) => (
            <div key={payment.id} className="flex items-center gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-medium">
                  {formatMoney(payment.amount)} <SourceBadge source={payment.source} />
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatDateTime(new Date(payment.occurredAt))} · {payment.walletName}
                  {payment.note && payment.note !== debt.counterparty && ` · ${payment.note}`}
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon-sm" disabled={pending} aria-label="To'lovni o'chirish">
                    <Trash2 />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>To&apos;lov o&apos;chirilsinmi?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {formatMoney(payment.amount)} kirim-chiqimdan ham o&apos;chiriladi va qarz qoldig&apos;i qayta
                      hisoblanadi.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      onClick={() => run(() => deleteDebtPayment({ id: payment.id }), "To'lov o'chirildi")}
                    >
                      O&apos;chirish
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
          {debt.paidBefore > 0 && (
            <div className="px-3 py-2.5">
              <p className="text-sm font-medium">{formatMoney(debt.paidBefore)}</p>
              <p className="text-xs text-muted-foreground">Tizimga kiritilishidan oldin {text.paidLabel.toLowerCase()}</p>
            </div>
          )}
          <div className="px-3 py-2.5">
            <p className="text-sm font-medium">
              {formatMoney(debt.amount)} — {isCredit ? "Kredit olindi" : text.principalLabel}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDateTime(new Date(debt.startedAt))}
              {debt.principal ? ` · ${debt.principal.walletName}` : " · kirim-chiqimga yozilmagan"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t pt-4">
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Pencil /> Tahrirlash
        </Button>
        {debt.closed ? (
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => run(() => setDebtClosed({ id: debt.id, closed: false }), "Qayta ochildi")}
          >
            <LockOpen /> Qayta ochish
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            title="Masalan, qarz kechilgan bo'lsa"
            onClick={() => run(() => setDebtClosed({ id: debt.id, closed: true }), "Yopildi")}
          >
            <Lock /> Yopish
          </Button>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" disabled={pending} className="ml-auto text-destructive">
              <Trash2 /> O&apos;chirish
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>«{debt.counterparty}» o&apos;chirilsinmi?</AlertDialogTitle>
              <AlertDialogDescription>
                Qarz va unga bog&apos;liq {debt.payments.length + (debt.principal ? 1 : 0)} ta kirim-chiqim yozuvi
                o&apos;chiriladi. Hisob-kitoblar shunga qarab o&apos;zgaradi.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => run(() => deleteDebt({ id: debt.id }), "Qarz o'chirildi", onClose)}
              >
                O&apos;chirish
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function PaymentForm({ debt, wallets, now }: { debt: DebtItem; wallets: WalletOption[]; now: string }) {
  const text = DEBT_TEXT[debt.direction];
  const suggested =
    debt.kind === "kredit" && debt.monthlyPayment ? Math.min(debt.monthlyPayment, debt.remaining) : debt.remaining;
  const [amount, setAmount] = useState(suggested);
  const [walletId, setWalletId] = useState(debt.principal?.walletId ?? wallets[0]?.id ?? "");
  const [occurredAt, setOccurredAt] = useState(now);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addDebtPayment({ debtId: debt.id, amount, walletId, occurredAt, note });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(text.paySaved);
      setNote("");
      setAmount(0);
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border bg-muted/20 p-3">
      <p className="text-sm font-semibold">{text.payAction}</p>
      {error && (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <AmountInput value={amount} onChange={setAmount} className="py-2 [&_input]:text-2xl" />
      <div className="flex flex-wrap gap-2">
        {debt.kind === "kredit" && debt.monthlyPayment && debt.monthlyPayment < debt.remaining && (
          <Button type="button" size="xs" variant="secondary" onClick={() => setAmount(debt.monthlyPayment ?? 0)}>
            Oylik: {formatMoney(debt.monthlyPayment)}
          </Button>
        )}
        <Button type="button" size="xs" variant="secondary" onClick={() => setAmount(debt.remaining)}>
          Hammasi: {formatMoney(debt.remaining)}
        </Button>
      </div>
      <div className="space-y-2">
        <Label>{text.paymentWallet}</Label>
        <WalletPicker wallets={wallets} value={walletId} onChange={setWalletId} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex gap-2">
          <Input
            type="datetime-local"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
            className="h-9 min-w-0 flex-1"
            aria-label="Sana va vaqt"
          />
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            aria-label="Hozirgi vaqt"
            onClick={() => setOccurredAt(toDateTimeInput(new Date()))}
          >
            <Clock />
          </Button>
        </div>
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Izoh (ixtiyoriy)"
          maxLength={500}
          className="h-9"
        />
      </div>
      <Button type="submit" className="w-full" disabled={pending || amount <= 0 || !walletId}>
        {pending && <Loader2 className="animate-spin" />}
        Saqlash
      </Button>
    </form>
  );
}
