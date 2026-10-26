"use client";

import { createContext, use, useId, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeftRight, CircleAlert, HandCoins, Loader2, Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  deleteEntry,
  restoreEntry,
  saveTransaction,
  saveTransfer,
  type ActionResult,
} from "@/app/(app)/kirim-chiqim/actions";
import { AmountInput } from "@/components/entries/amount-input";
import { ActivePill } from "@/components/motion/active-pill";
import { notifyRobot } from "@/components/robot/events";
import { CategoryPicker, WalletPicker } from "@/components/entries/option-pickers";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DateTimePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatRate, fromMinor, minorToUzs, toMinor, type Currency } from "@/lib/currency";
import { formatDateTime, toDateTimeInput } from "@/lib/dates";
import type { Entry, EntryOptions } from "@/lib/entries";
import { cn } from "@/lib/utils";

export type EntryKind = "chiqim" | "kirim" | "otkazma";

type Payload =
  | { mode: "new"; kind: EntryKind; now: string; walletId: string; preset?: EntryPreset }
  | { mode: "edit"; entry: Entry };

/** Oldindan to'ldirilgan maydonlar — masalan "Oylik kiritish" uchun Oylik kategoriyasi */
export type EntryPreset = { categoryId?: string; walletId?: string; note?: string; title?: string };

type EditorApi = {
  openNew: (kind: EntryKind, preset?: EntryPreset) => void;
  openEdit: (entry: Entry) => void;
};
const EditorContext = createContext<EditorApi | null>(null);

export function useEntryEditor() {
  const api = use(EditorContext);
  if (!api) throw new Error("useEntryEditor EntryEditorProvider ichida ishlatilishi kerak");
  return api;
}

const LAST_WALLET_KEY = "hisob:oxirgi-hamyon";

function readLastWallet() {
  try {
    return localStorage.getItem(LAST_WALLET_KEY) ?? "";
  } catch {
    return "";
  }
}

function rememberWallet(id: string) {
  try {
    localStorage.setItem(LAST_WALLET_KEY, id);
  } catch {
    // brauzer xotirasi yopiq bo'lsa — shunchaki eslab qolinmaydi
  }
}

/** Kirim, chiqim va o'tkazma oynasi; sahifadagi istalgan tugma useEntryEditor() orqali ochadi */
export function EntryEditorProvider({ options, children }: { options: EntryOptions; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<Payload | null>(null);
  const [version, setVersion] = useState(0);

  const show = (next: Payload) => {
    setPayload(next);
    setVersion((v) => v + 1);
    setOpen(true);
  };

  const api: EditorApi = {
    openNew: (kind, preset) => {
      const wanted = preset?.walletId ?? readLastWallet();
      const walletId = options.wallets.some((w) => w.id === wanted) ? wanted : (options.wallets[0]?.id ?? "");
      show({ mode: "new", kind, now: toDateTimeInput(new Date()), walletId, preset });
    },
    openEdit: (entry) => show({ mode: "edit", entry }),
  };

  return (
    <EditorContext value={api}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-lg">
          {payload && (
            <EntryForm key={version} payload={payload} options={options} onDone={() => setOpen(false)} />
          )}
        </DialogContent>
      </Dialog>
    </EditorContext>
  );
}

// pill — tanlangan tur foni (sirpanib o'tayotganda rangi ham silliq almashadi)
const KIND_META: Record<EntryKind, { label: string; icon: typeof Plus; pill: string }> = {
  chiqim: { label: "Chiqim", icon: Minus, pill: "bg-expense" },
  kirim: { label: "Kirim", icon: Plus, pill: "bg-income" },
  otkazma: { label: "O'tkazma", icon: ArrowLeftRight, pill: "bg-primary" },
};

async function undoableDelete(entry: Entry, onDone: () => void) {
  const ref = { kind: entry.kind, id: entry.id };
  const result = await deleteEntry(ref);
  if (!result.ok) {
    toast.error(result.error);
    return;
  }
  onDone();
  toast.success("Savatchaga o'tkazildi", {
    action: {
      label: "Qaytarish",
      onClick: async () => {
        const restored = await restoreEntry(ref);
        if (restored.ok) toast.success("Qaytarildi");
        else toast.error(restored.error);
      },
    },
  });
}

function EntryForm({ payload, options, onDone }: { payload: Payload; options: EntryOptions; onDone: () => void }) {
  const editing = payload.mode === "edit" ? payload.entry : null;
  const preset = payload.mode === "new" ? payload.preset : undefined;
  const tx = editing?.kind === "tx" ? editing : null;
  const transfer = editing?.kind === "transfer" ? editing : null;

  const [kind, setKind] = useState<EntryKind>(
    payload.mode === "new" ? payload.kind : transfer ? "otkazma" : (tx?.type ?? "chiqim"),
  );
  // Summa hamyon valyutasida (eng kichik birlikda): chet valyutali yozuvda asl summa, so'mlida — so'm
  const [amount, setAmount] = useState(tx ? (tx.originalAmount ?? tx.amount) : (editing?.amount ?? 0));
  const [categoryId, setCategoryId] = useState(tx?.categoryId ?? preset?.categoryId ?? "");
  const [walletId, setWalletId] = useState(tx?.walletId ?? (payload.mode === "new" ? payload.walletId : ""));
  const [fromWalletId, setFromWalletId] = useState(
    transfer?.fromWalletId ?? (payload.mode === "new" ? payload.walletId : ""),
  );
  const [toWalletId, setToWalletId] = useState(transfer?.toWalletId ?? "");
  // Har xil valyutali o'tkazmada tushgan summa: qo'lda o'zgartirilmaguncha kurs bo'yicha hisoblanadi
  const [toAmount, setToAmount] = useState(transfer?.toAmount ?? 0);
  const [toTouched, setToTouched] = useState(Boolean(transfer));
  const [occurredAt, setOccurredAt] = useState(
    editing ? toDateTimeInput(new Date(editing.occurredAt)) : payload.mode === "new" ? payload.now : "",
  );
  const [note, setNote] = useState(editing?.note ?? preset?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Bir sahifada bir nechta oyna bo'lishi mumkin — sirpanuvchi fon nomi har biriga alohida
  const pillId = useId();

  if (tx?.debtId) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Qarzga bog&apos;langan yozuv</DialogTitle>
          <DialogDescription>{formatDateTime(new Date(tx.occurredAt))}</DialogDescription>
        </DialogHeader>
        <Alert>
          <HandCoins />
          <AlertDescription>
            Bu yozuv qarz yoki kredit amali orqali yaratilgan. Uni o&apos;zgartirish yoki o&apos;chirish uchun Qarzlar
            bo&apos;limiga o&apos;ting — shunda qarz qoldig&apos;i ham to&apos;g&apos;ri hisoblanadi.
          </AlertDescription>
        </Alert>
        <DialogFooter>
          <Button variant="outline" onClick={onDone}>
            Yopish
          </Button>
          <Button asChild>
            <Link href="/qarzlar" onClick={onDone}>
              Qarzlarga o&apos;tish
            </Link>
          </Button>
        </DialogFooter>
      </>
    );
  }

  const categories = options.categories.filter((c) => c.type === kind);
  const kinds: EntryKind[] = transfer ? ["otkazma"] : tx ? ["chiqim", "kirim"] : ["chiqim", "kirim", "otkazma"];

  const currencyOfWallet = (id: string): Currency => options.wallets.find((w) => w.id === id)?.currency ?? "UZS";
  const rateOf = (c: Currency) => (c === "UZS" ? 1 : (options.rates[c] ?? 0));
  const amountCurrency = currencyOfWallet(kind === "otkazma" ? fromWalletId : walletId);
  const toCurrency = currencyOfWallet(toWalletId);
  const crossCurrency = kind === "otkazma" && Boolean(toWalletId) && amountCurrency !== toCurrency;
  const autoToAmount =
    crossCurrency && rateOf(amountCurrency) && rateOf(toCurrency)
      ? toMinor((fromMinor(amount, amountCurrency) * rateOf(amountCurrency)) / rateOf(toCurrency), toCurrency)
      : 0;
  const shownToAmount = toTouched ? toAmount : autoToAmount;
  // Tahrirda valyuta o'zgarmagan bo'lsa — yozuvning o'z kursi, aks holda bugungi
  const txRate = tx?.rate && tx.currency === amountCurrency ? tx.rate : rateOf(amountCurrency);

  /** Hamyon valyutasi o'zgarsa yozilgan raqam saqlanadi, faqat birligi almashadi (50 000 so'm → 50 000 $) */
  const switchCurrency = (next: Currency) => {
    if (next !== amountCurrency) setAmount((a) => toMinor(fromMinor(a, amountCurrency), next));
  };

  const changeKind = (next: EntryKind) => {
    switchCurrency(currencyOfWallet(next === "otkazma" ? fromWalletId : walletId));
    setKind(next);
    setError(null);
    if (!options.categories.some((c) => c.id === categoryId && c.type === next)) setCategoryId("");
  };

  const ready =
    amount > 0 &&
    Boolean(occurredAt) &&
    (kind === "otkazma"
      ? Boolean(fromWalletId && toWalletId && fromWalletId !== toWalletId) && (!crossCurrency || shownToAmount > 0)
      : Boolean(categoryId && walletId));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!ready) return;
    setError(null);
    startTransition(async () => {
      let result: ActionResult;
      if (kind === "otkazma") {
        result = await saveTransfer({
          id: transfer?.id,
          fromWalletId,
          toWalletId,
          amount,
          toAmount: crossCurrency ? shownToAmount : undefined,
          occurredAt,
          note,
        });
      } else {
        result = await saveTransaction({ id: tx?.id, type: kind, amount, categoryId, walletId, occurredAt, note });
      }
      if (!result.ok) {
        setError(result.error);
        return;
      }
      rememberWallet(kind === "otkazma" ? fromWalletId : walletId);
      toast.success(editing ? "Saqlandi" : `${KIND_META[kind].label} qo'shildi`);
      // Oydin ham xabardor bo'lsin (kirimga quvonadi, katta xarajatga xavotirlanadi)
      notifyRobot({ type: "entry", kind, editing: Boolean(editing), big: minorToUzs(amount, amountCurrency, txRate) >= 1_000_000 });
      onDone();
    });
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <DialogHeader>
        <DialogTitle>{editing ? "Yozuvni tahrirlash" : (preset?.title ?? "Yangi yozuv")}</DialogTitle>
        <DialogDescription>
          {editing
            ? `Kiritilgan: ${formatDateTime(new Date(editing.createdAt))}`
            : "Summa, kategoriya va hamyonni tanlang"}
        </DialogDescription>
      </DialogHeader>

      {kinds.length > 1 && (
        <div className="grid gap-1 rounded-full bg-muted p-1" style={{ gridTemplateColumns: `repeat(${kinds.length}, 1fr)` }}>
          {kinds.map((k) => {
            const meta = KIND_META[k];
            return (
              <button
                key={k}
                type="button"
                onClick={() => changeKind(k)}
                className={cn(
                  "relative flex items-center justify-center gap-1.5 rounded-full py-2 text-sm font-medium transition-colors duration-200",
                  kind === k ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {kind === k && (
                  <ActivePill layoutId={`${pillId}-kind`} className={cn("transition-colors duration-300", meta.pill)} />
                )}
                <meta.icon className="relative size-4" /> <span className="relative">{meta.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="entry-amount">Summa</Label>
        <AmountInput id="entry-amount" value={amount} onChange={setAmount} currency={amountCurrency} autoFocus={!editing} />
        {kind !== "otkazma" && amountCurrency !== "UZS" && (
          <p className="text-xs text-muted-foreground">
            {txRate > 0 ? (
              <>
                ≈ {formatCurrency(minorToUzs(amount, amountCurrency, txRate), "UZS")} · {formatRate(amountCurrency, txRate)}
              </>
            ) : (
              "Kurs hali olinmagan — saqlashda yangilanadi"
            )}
          </p>
        )}
      </div>

      {kind === "otkazma" ? (
        <>
          <div className="space-y-2">
            <Label>Qaysi hamyondan</Label>
            <WalletPicker
              wallets={options.wallets}
              value={fromWalletId}
              onChange={(id) => {
                switchCurrency(currencyOfWallet(id));
                setFromWalletId(id);
              }}
              disabledId={toWalletId}
            />
          </div>
          <div className="space-y-2">
            <Label>Qaysi hamyonga</Label>
            <WalletPicker wallets={options.wallets} value={toWalletId} onChange={setToWalletId} disabledId={fromWalletId} />
          </div>
          {crossCurrency ? (
            <div className="space-y-2 rounded-xl border border-dashed p-3">
              <Label htmlFor="entry-to-amount">Hamyonga tushgan summa</Label>
              <AmountInput
                id="entry-to-amount"
                value={shownToAmount}
                currency={toCurrency}
                onChange={(value) => {
                  setToTouched(true);
                  setToAmount(value);
                }}
              />
              <p className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  {rateOf(amountCurrency) && rateOf(toCurrency)
                    ? `Bugungi kurs bo'yicha hisoblandi · ${formatRate(amountCurrency === "UZS" ? toCurrency : amountCurrency, rateOf(amountCurrency === "UZS" ? toCurrency : amountCurrency))}`
                    : "Kurs hali olinmagan — summani qo'lda kiriting"}
                </span>
                {toTouched && autoToAmount > 0 && (
                  <button type="button" className="underline-offset-4 hover:underline" onClick={() => setToTouched(false)}>
                    Kurs bo&apos;yicha qaytarish
                  </button>
                )}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              O&apos;tkazma kirim ham, chiqim ham hisoblanmaydi — faqat hamyonlar qoldig&apos;i o&apos;zgaradi.
            </p>
          )}
        </>
      ) : (
        <>
          <div className="space-y-2">
            <Label>Kategoriya</Label>
            <CategoryPicker categories={categories} value={categoryId} onChange={setCategoryId} />
          </div>
          <div className="space-y-2">
            <Label>Hamyon</Label>
            <WalletPicker
              wallets={options.wallets}
              value={walletId}
              onChange={(id) => {
                switchCurrency(currencyOfWallet(id));
                setWalletId(id);
              }}
            />
          </div>
        </>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="entry-date">Sana va vaqt</Label>
          <DateTimePicker id="entry-date" value={occurredAt} onChange={setOccurredAt} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="entry-note">Izoh</Label>
          <Input
            id="entry-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            placeholder="Masalan: taksi, uyga"
            className="h-9"
          />
        </div>
      </div>

      <DialogFooter className="gap-2 sm:justify-between">
        {editing ? (
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={() => startTransition(() => undoableDelete(editing, onDone))}
          >
            <Trash2 /> O&apos;chirish
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onDone}>
            Bekor qilish
          </Button>
          <Button type="submit" disabled={!ready || pending} className="min-w-28">
            {pending && <Loader2 className="animate-spin" />}
            Saqlash
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}
