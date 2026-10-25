"use client";

import { useState, useTransition } from "react";
import { CircleAlert, HandCoins, Landmark, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { saveDebt } from "@/app/(app)/qarzlar/actions";
import { DEBT_TEXT } from "@/components/debts/debt-text";
import { AmountInput } from "@/components/entries/amount-input";
import { WalletPicker } from "@/components/entries/option-pickers";
import { ActivePill } from "@/components/motion/active-pill";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DateTimePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MonthDayPicker } from "@/components/ui/month-day-picker";
import { NumberInput } from "@/components/ui/number-input";
import { Switch } from "@/components/ui/switch";
import type { DebtItem } from "@/lib/data/debts";
import { toDateInput, toDateTimeInput } from "@/lib/dates";
import type { DebtDirection, DebtKind } from "@/lib/domain";
import type { WalletOption } from "@/lib/entries";
import { formatAmount, formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";


export function DebtForm({
  direction,
  initialKind,
  debt,
  wallets,
  now,
  onDone,
}: {
  direction: DebtDirection;
  initialKind: DebtKind;
  debt: DebtItem | null;
  wallets: WalletOption[];
  /** Ochilgan paytdagi vaqt ("2026-10-22T14:35") */
  now: string;
  onDone: () => void;
}) {
  const text = DEBT_TEXT[direction];
  const [kind, setKind] = useState<DebtKind>(debt?.kind ?? initialKind);
  const [counterparty, setCounterparty] = useState(debt?.counterparty ?? "");
  const [amount, setAmount] = useState(debt?.amount ?? 0);
  const [startedAt, setStartedAt] = useState(debt ? toDateTimeInput(new Date(debt.startedAt)) : now);
  const [dueDate, setDueDate] = useState(debt?.dueDate ? toDateInput(new Date(debt.dueDate)) : "");
  const [monthlyPayment, setMonthlyPayment] = useState(debt?.monthlyPayment ?? 0);
  const [paymentDay, setPaymentDay] = useState(debt?.paymentDay ?? Number(now.slice(8, 10)));
  const [termMonths, setTermMonths] = useState(debt?.termMonths ? String(debt.termMonths) : "");
  const [paidBefore, setPaidBefore] = useState(debt?.paidBefore ?? 0);
  const [paidMonths, setPaidMonths] = useState(
    debt?.kind === "kredit" && debt.monthlyPayment ? String(Math.round(debt.paidBefore / debt.monthlyPayment)) : "0",
  );
  const [recordEntry, setRecordEntry] = useState(debt ? Boolean(debt.principal) : true);
  const [walletId, setWalletId] = useState(debt?.principal?.walletId ?? wallets[0]?.id ?? "");
  const [note, setNote] = useState(debt?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isCredit = kind === "kredit";
  const term = Number(termMonths) || 0;
  const ready =
    counterparty.trim() &&
    amount > 0 &&
    startedAt &&
    (!recordEntry || walletId) &&
    (!isCredit || (monthlyPayment > 0 && term > 0));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!ready) return;
    setError(null);
    startTransition(async () => {
      const result = await saveDebt({
        id: debt?.id,
        direction,
        kind,
        counterparty,
        amount,
        startedAt,
        dueDate: isCredit ? undefined : dueDate || undefined,
        monthlyPayment: isCredit ? monthlyPayment : null,
        paymentDay: isCredit ? paymentDay : null,
        termMonths: isCredit ? term : null,
        paidBefore: isCredit ? (Number(paidMonths) || 0) * monthlyPayment : paidBefore,
        recordEntry,
        walletId,
        note,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(debt ? "Saqlandi" : isCredit ? "Kredit qo'shildi" : "Qarz qo'shildi");
      onDone();
    });
  };

  const title = debt ? "Tahrirlash" : isCredit ? "Kredit oldim" : direction === "olingan" ? "Qarz oldim" : "Qarz berdim";

  return (
    <form onSubmit={submit} className="space-y-5">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>
          {isCredit
            ? "Bank jadvalidagi oylik to'lov va muddatni kiriting — qolgan qarz va keyingi to'lov o'zi hisoblanadi"
            : "Qisman qaytarishlarni keyin qarz kartochkasidan qo'shasiz"}
        </DialogDescription>
      </DialogHeader>

      {!debt && direction === "olingan" && (
        <div className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
          {(
            [
              ["shaxs", "Odamdan", HandCoins],
              ["kredit", "Bankdan kredit", Landmark],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              onClick={() => setKind(value)}
              className={cn(
                "relative flex items-center justify-center gap-1.5 rounded-full py-2 text-sm font-medium transition-colors duration-200",
                kind === value ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {kind === value && <ActivePill layoutId="debt-form-kind" className="bg-card shadow-sm" />}
              <Icon className="relative size-4" /> <span className="relative">{label}</span>
            </button>
          ))}
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="debt-person">{isCredit ? "Bank nomi" : text.personLabel}</Label>
        <Input
          id="debt-person"
          value={counterparty}
          onChange={(e) => setCounterparty(e.target.value)}
          maxLength={120}
          placeholder={isCredit ? "Masalan: Kapitalbank" : text.personPlaceholder}
          autoFocus={!debt}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="debt-amount">{isCredit ? "Kredit summasi (qo'lingizga tushgan)" : "Summa"}</Label>
        <AmountInput id="debt-amount" value={amount} onChange={setAmount} />
      </div>

      {isCredit && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="debt-monthly">Oylik to&apos;lov (bank jadvali bo&apos;yicha)</Label>
            <AmountInput id="debt-monthly" value={monthlyPayment} onChange={setMonthlyPayment} />
          </div>
          <div className="space-y-2">
            <Label>To&apos;lov kuni</Label>
            <MonthDayPicker value={paymentDay} onChange={setPaymentDay} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="debt-term">Muddati (oy)</Label>
            <NumberInput
              id="debt-term"
              value={termMonths}
              onChange={setTermMonths}
              min={1}
              max={600}
              suffix="oy"
              placeholder="Masalan: 24"
            />
          </div>
          {monthlyPayment > 0 && term > 0 && (
            <p className="text-xs text-muted-foreground sm:col-span-2">
              Qaytariladigan jami: {term} × {formatAmount(monthlyPayment)} ={" "}
              <b className="text-foreground">{formatMoney(term * monthlyPayment)}</b>
            </p>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="debt-date">{isCredit ? "Kredit olingan sana" : "Qachon"}</Label>
          <DateTimePicker id="debt-date" value={startedAt} onChange={setStartedAt} />
        </div>
        {isCredit ? (
          <div className="space-y-2">
            <Label htmlFor="debt-paid-months">Allaqachon to&apos;langan oylar</Label>
            <NumberInput id="debt-paid-months" value={paidMonths} onChange={setPaidMonths} max={600} suffix="oy" placeholder="0" />
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="debt-due">Qaytarish muddati (ixtiyoriy)</Label>
            <DateTimePicker
              id="debt-due"
              value={dueDate}
              onChange={setDueDate}
              withTime={false}
              clearable
              placeholder="Muddatsiz"
            />
          </div>
        )}
      </div>

      {!isCredit && (
        <div className="space-y-2">
          <Label htmlFor="debt-paid-before">{DEBT_TEXT[direction].paidBeforeLabel} (eski qarz bo&apos;lsa)</Label>
          <AmountInput id="debt-paid-before" value={paidBefore} onChange={setPaidBefore} />
        </div>
      )}

      <div className="space-y-3 rounded-xl border p-3">
        <label className="flex items-start justify-between gap-3">
          <span className="space-y-0.5">
            <span className="block text-sm font-medium">{text.recordLabel}</span>
            <span className="block text-xs text-muted-foreground">{text.recordHint}</span>
          </span>
          <Switch checked={recordEntry} onCheckedChange={setRecordEntry} />
        </label>
        {recordEntry && (
          <div className="space-y-2">
            <Label>{text.walletLabel}</Label>
            <WalletPicker wallets={wallets} value={walletId} onChange={setWalletId} />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="debt-note">Izoh</Label>
        <Input id="debt-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Bekor qilish
        </Button>
        <Button type="submit" disabled={!ready || pending} className="min-w-28">
          {pending && <Loader2 className="animate-spin" />}
          Saqlash
        </Button>
      </DialogFooter>
    </form>
  );
}
