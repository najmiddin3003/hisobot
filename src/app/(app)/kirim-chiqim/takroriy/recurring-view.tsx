"use client";

import { useState, useTransition } from "react";
import { CalendarClock, CircleAlert, Loader2, Minus, Pencil, Plus, Repeat, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ColorIcon } from "@/components/color-icon";
import { AmountInput } from "@/components/entries/amount-input";
import { Money } from "@/components/money";
import { ActivePill } from "@/components/motion/active-pill";
import { CategoryPicker, WalletPicker } from "@/components/entries/option-pickers";
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
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { RecurringItem } from "@/lib/data/entries";
import { formatDate } from "@/lib/dates";
import type { TxType } from "@/lib/domain";
import type { EntryOptions } from "@/lib/entries";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { deleteRecurring, saveRecurring, setRecurringActive } from "../actions";

export function RecurringView({ items, options }: { items: RecurringItem[]; options: EntryOptions }) {
  const [editing, setEditing] = useState<RecurringItem | "new" | null>(null);
  const [version, setVersion] = useState(0);

  const open = (item: RecurringItem | "new") => {
    setEditing(item);
    setVersion((v) => v + 1);
  };

  const active = items.filter((i) => i.active);
  const monthlyExpense = active.filter((i) => i.type === "chiqim").reduce((sum, i) => sum + i.amount, 0);
  const monthlyIncome = active.filter((i) => i.type === "kirim").reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="space-y-6">
      <Card className="py-0">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Repeat className="size-5" />
            </span>
            <div className="space-y-1 text-sm">
              <p className="font-medium">
                Har oy: <span className="text-expense">{formatMoney(monthlyExpense)}</span> chiqim
                {monthlyIncome > 0 && (
                  <>
                    , <span className="text-income">{formatMoney(monthlyIncome)}</span> kirim
                  </>
                )}
              </p>
              <p className="text-muted-foreground">
                Belgilangan kunda kirim-chiqimga o&apos;zi yoziladi va «Avtomatik» belgisi bilan ko&apos;rinadi.
              </p>
            </div>
          </div>
          <Button onClick={() => open("new")} className="shrink-0">
            <Plus /> Yangi takroriy to&apos;lov
          </Button>
        </CardContent>
      </Card>

      {items.length > 0 ? (
        <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <RecurringCard key={item.id} item={item} onEdit={() => open(item)} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-10 text-center">
          <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CalendarClock className="size-5" />
          </div>
          <div className="space-y-1">
            <p className="font-medium">Takroriy to&apos;lovlar yo&apos;q</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Ijara, internet, telefon, obunalar — har oy takrorlanadigan to&apos;lovlarni qo&apos;shing, ular o&apos;zi
              yoziladi.
            </p>
          </div>
        </div>
      )}

      <Dialog open={editing !== null} onOpenChange={(value) => !value && setEditing(null)}>
        <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-lg">
          {editing !== null && (
            <RecurringForm
              key={version}
              item={editing === "new" ? null : editing}
              options={options}
              onDone={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RecurringCard({ item, onEdit }: { item: RecurringItem; onEdit: () => void }) {
  const [pending, startTransition] = useTransition();

  const toggle = (active: boolean) =>
    startTransition(async () => {
      const result = await setRecurringActive({ id: item.id, active });
      if (!result.ok) toast.error(result.error);
      else toast.success(active ? "Yoqildi" : "To'xtatildi");
    });

  const remove = () =>
    startTransition(async () => {
      const result = await deleteRecurring({ id: item.id });
      if (!result.ok) toast.error(result.error);
      else toast.success("O'chirildi");
    });

  return (
    <Card className={cn("gap-4", !item.active && "opacity-70")}>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <ColorIcon icon={item.category.icon} color={item.category.color} className="size-10 rounded-xl" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{item.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {item.category.name} · {item.wallet.name}
            </p>
          </div>
          <Switch
            checked={item.active}
            onCheckedChange={toggle}
            disabled={pending}
            aria-label={item.active ? "To'xtatish" : "Yoqish"}
          />
        </div>

        <Money
          amount={item.type === "kirim" ? item.amount : -item.amount}
          sign
          className={cn("block truncate text-[1.75rem]", item.type === "kirim" ? "text-income" : "text-expense")}
        />

        <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs">
          <span className="text-muted-foreground">Har oyning {item.dayOfMonth}-kuni</span>
          <span className="font-medium">
            {item.active && item.nextDate ? `Keyingi: ${formatDate(new Date(item.nextDate))}` : "To'xtatilgan"}
          </span>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={onEdit}>
            <Pencil /> Tahrirlash
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" disabled={pending} aria-label="O'chirish">
                {pending ? <Loader2 className="animate-spin" /> : <Trash2 />}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>«{item.name}» o&apos;chirilsinmi?</AlertDialogTitle>
                <AlertDialogDescription>
                  Endi har oy avtomatik yozilmaydi. Avval yozilgan yozuvlar kirim-chiqimda qoladi.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={remove}>
                  O&apos;chirish
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

function RecurringForm({
  item,
  options,
  onDone,
}: {
  item: RecurringItem | null;
  options: EntryOptions;
  onDone: () => void;
}) {
  const [type, setType] = useState<TxType>(item?.type ?? "chiqim");
  const [name, setName] = useState(item?.name ?? "");
  const [amount, setAmount] = useState(item?.amount ?? 0);
  const [categoryId, setCategoryId] = useState(item?.categoryId ?? "");
  const [walletId, setWalletId] = useState(item?.walletId ?? options.wallets[0]?.id ?? "");
  const [dayOfMonth, setDayOfMonth] = useState(item?.dayOfMonth ?? 1);
  const [note, setNote] = useState(item?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const categories = options.categories.filter((c) => c.type === type);
  const ready = name.trim() && amount > 0 && categoryId && walletId;

  const changeType = (next: TxType) => {
    setType(next);
    if (!options.categories.some((c) => c.id === categoryId && c.type === next)) setCategoryId("");
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!ready) return;
    setError(null);
    startTransition(async () => {
      const result = await saveRecurring({ id: item?.id, name, type, amount, categoryId, walletId, dayOfMonth, note });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(item ? "Saqlandi" : "Takroriy to'lov qo'shildi");
      onDone();
    });
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <DialogHeader>
        <DialogTitle>{item ? "Takroriy to'lovni tahrirlash" : "Yangi takroriy to'lov"}</DialogTitle>
        <DialogDescription>Har oy tanlangan kunda kirim-chiqimga avtomatik yoziladi</DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
        {(["chiqim", "kirim"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => changeType(t)}
            className={cn(
              "relative flex items-center justify-center gap-1.5 rounded-full py-2 text-sm font-medium transition-colors duration-200",
              type === t ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {type === t && (
              <ActivePill
                layoutId="recurring-type"
                className={cn("transition-colors duration-300", t === "chiqim" ? "bg-expense" : "bg-income")}
              />
            )}
            {t === "chiqim" ? <Minus className="relative size-4" /> : <Plus className="relative size-4" />}
            <span className="relative">{t === "chiqim" ? "Chiqim" : "Kirim"}</span>
          </button>
        ))}
      </div>

      {error && (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="recurring-name">Nomi</Label>
        <Input
          id="recurring-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          placeholder="Masalan: Uy ijarasi, Internet, Netflix"
          autoFocus={!item}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="recurring-amount">Summa</Label>
        <AmountInput id="recurring-amount" value={amount} onChange={setAmount} />
      </div>

      <div className="space-y-2">
        <Label>Kategoriya</Label>
        <CategoryPicker categories={categories} value={categoryId} onChange={setCategoryId} />
      </div>

      <div className="space-y-2">
        <Label>Hamyon</Label>
        <WalletPicker wallets={options.wallets} value={walletId} onChange={setWalletId} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Har oyning qaysi kuni</Label>
          <Select value={String(dayOfMonth)} onValueChange={(v) => setDayOfMonth(Number(v))}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {DAYS.map((d) => (
                <SelectItem key={d} value={String(d)}>
                  {d}-kuni
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="recurring-note">Izoh</Label>
          <Input id="recurring-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
        </div>
      </div>

      {!item && (
        <p className="text-xs text-muted-foreground">
          Bu oyda to&apos;lov kuni o&apos;tib ketgan bo&apos;lsa, birinchi yozuv keyingi oyda qo&apos;shiladi. Oyda
          {" "}31-kun bo&apos;lmasa, oyning oxirgi kuni olinadi.
        </p>
      )}

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
