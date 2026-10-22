"use client";

import { createContext, use, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeftRight, CircleAlert, Clock, HandCoins, Loader2, Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  deleteEntry,
  restoreEntry,
  saveTransaction,
  saveTransfer,
  type ActionResult,
} from "@/app/(app)/kirim-chiqim/actions";
import { AmountInput } from "@/components/entries/amount-input";
import { CategoryPicker, WalletPicker } from "@/components/entries/option-pickers";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const KIND_META: Record<EntryKind, { label: string; icon: typeof Plus; active: string }> = {
  chiqim: { label: "Chiqim", icon: Minus, active: "bg-expense text-white" },
  kirim: { label: "Kirim", icon: Plus, active: "bg-income text-white" },
  otkazma: { label: "O'tkazma", icon: ArrowLeftRight, active: "bg-primary text-primary-foreground" },
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
  const [amount, setAmount] = useState(editing?.amount ?? 0);
  const [categoryId, setCategoryId] = useState(tx?.categoryId ?? preset?.categoryId ?? "");
  const [walletId, setWalletId] = useState(tx?.walletId ?? (payload.mode === "new" ? payload.walletId : ""));
  const [fromWalletId, setFromWalletId] = useState(
    transfer?.fromWalletId ?? (payload.mode === "new" ? payload.walletId : ""),
  );
  const [toWalletId, setToWalletId] = useState(transfer?.toWalletId ?? "");
  const [occurredAt, setOccurredAt] = useState(
    editing ? toDateTimeInput(new Date(editing.occurredAt)) : payload.mode === "new" ? payload.now : "",
  );
  const [note, setNote] = useState(editing?.note ?? preset?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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

  const changeKind = (next: EntryKind) => {
    setKind(next);
    setError(null);
    if (!options.categories.some((c) => c.id === categoryId && c.type === next)) setCategoryId("");
  };

  const ready =
    amount > 0 &&
    Boolean(occurredAt) &&
    (kind === "otkazma"
      ? Boolean(fromWalletId && toWalletId && fromWalletId !== toWalletId)
      : Boolean(categoryId && walletId));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!ready) return;
    setError(null);
    startTransition(async () => {
      let result: ActionResult;
      if (kind === "otkazma") {
        result = await saveTransfer({ id: transfer?.id, fromWalletId, toWalletId, amount, occurredAt, note });
      } else {
        result = await saveTransaction({ id: tx?.id, type: kind, amount, categoryId, walletId, occurredAt, note });
      }
      if (!result.ok) {
        setError(result.error);
        return;
      }
      rememberWallet(kind === "otkazma" ? fromWalletId : walletId);
      toast.success(editing ? "Saqlandi" : `${KIND_META[kind].label} qo'shildi`);
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
        <div className="grid gap-1 rounded-xl bg-muted p-1" style={{ gridTemplateColumns: `repeat(${kinds.length}, 1fr)` }}>
          {kinds.map((k) => {
            const meta = KIND_META[k];
            return (
              <button
                key={k}
                type="button"
                onClick={() => changeKind(k)}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors",
                  kind === k ? meta.active : "text-muted-foreground hover:text-foreground",
                )}
              >
                <meta.icon className="size-4" /> {meta.label}
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
        <AmountInput id="entry-amount" value={amount} onChange={setAmount} autoFocus={!editing} />
      </div>

      {kind === "otkazma" ? (
        <>
          <div className="space-y-2">
            <Label>Qaysi hamyondan</Label>
            <WalletPicker wallets={options.wallets} value={fromWalletId} onChange={setFromWalletId} disabledId={toWalletId} />
          </div>
          <div className="space-y-2">
            <Label>Qaysi hamyonga</Label>
            <WalletPicker wallets={options.wallets} value={toWalletId} onChange={setToWalletId} disabledId={fromWalletId} />
          </div>
          <p className="text-xs text-muted-foreground">
            O&apos;tkazma kirim ham, chiqim ham hisoblanmaydi — faqat hamyonlar qoldig&apos;i o&apos;zgaradi.
          </p>
        </>
      ) : (
        <>
          <div className="space-y-2">
            <Label>Kategoriya</Label>
            <CategoryPicker categories={categories} value={categoryId} onChange={setCategoryId} />
          </div>
          <div className="space-y-2">
            <Label>Hamyon</Label>
            <WalletPicker wallets={options.wallets} value={walletId} onChange={setWalletId} />
          </div>
        </>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="entry-date">Sana va vaqt</Label>
          <div className="flex gap-2">
            <Input
              id="entry-date"
              type="datetime-local"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              required
              className="h-9 min-w-0 flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              title="Hozirgi vaqt"
              aria-label="Hozirgi vaqt"
              onClick={() => setOccurredAt(toDateTimeInput(new Date()))}
            >
              <Clock />
            </Button>
          </div>
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
