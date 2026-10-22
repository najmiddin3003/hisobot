"use client";

import { useState, useTransition } from "react";
import { CircleAlert, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AmountInput } from "@/components/entries/amount-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { WalletBalance } from "@/lib/data/budget";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { setWalletBalance } from "./actions";

/** "Hamyonda hozir qancha bor?" — farq boshlang'ich qoldiqqa yoziladi */
export function BalanceForm({ wallet, onDone }: { wallet: WalletBalance; onDone: () => void }) {
  const [actual, setActual] = useState(Math.max(wallet.balance, 0));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const diff = actual - wallet.balance;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await setWalletBalance({ walletId: wallet.id, actual });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(`${wallet.name}: qoldiq yangilandi`);
      onDone();
    });
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <DialogHeader>
        <DialogTitle>{wallet.name} — qoldiqni kiritish</DialogTitle>
        <DialogDescription>
          Hamyonda hozir haqiqatda qancha pul borligini yozing. Kirim-chiqim yozuvlari o&apos;zgarmaydi.
        </DialogDescription>
      </DialogHeader>

      {error && (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
        Tizim bo&apos;yicha hozir: <b className="tabular-nums">{formatMoney(wallet.balance)}</b>
      </div>

      <div className="space-y-2">
        <Label htmlFor="actual-balance">Haqiqiy qoldiq</Label>
        <AmountInput id="actual-balance" value={actual} onChange={setActual} autoFocus />
        {diff !== 0 && (
          <p className={cn("text-xs font-medium", diff > 0 ? "text-income" : "text-expense")}>
            Farq: {formatMoney(diff, { sign: true })}
          </p>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Bekor qilish
        </Button>
        <Button type="submit" disabled={pending || diff === 0} className="min-w-28">
          {pending && <Loader2 className="animate-spin" />}
          Saqlash
        </Button>
      </DialogFooter>
    </form>
  );
}
