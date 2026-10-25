"use client";

import { useId, useState, useTransition } from "react";
import { CircleAlert, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ColorIcon } from "@/components/color-icon";
import { AmountInput } from "@/components/entries/amount-input";
import { ActivePill } from "@/components/motion/active-pill";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CategoryItem, WalletItem } from "@/lib/data/settings";
import { CURRENCIES, CURRENCY_META, fromMinor, toMinor, type Currency } from "@/lib/currency";
import { WALLET_KINDS, WALLET_KIND_LABELS, type TxType, type WalletKind } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { COLORS, ColorPicker, IconPicker, KeywordsInput } from "./appearance-fields";
import { saveCategory, saveWallet } from "./catalog-actions";

function Segmented<T extends string>({
  value,
  options,
  onChange,
  disabled,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  const pillId = useId();
  return (
    <div className={cn("grid gap-1 rounded-full bg-muted p-1", disabled && "opacity-60")} style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(o.value)}
          className={cn(
            "relative rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-200 disabled:cursor-not-allowed",
            value === o.value ? "text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {value === o.value && <ActivePill layoutId={pillId} className="bg-card shadow-sm" />}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

function FormError({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <Alert variant="destructive">
      <CircleAlert />
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );
}

function Preview({ icon, color, name, hint }: { icon: string; color: string; name: string; hint: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
      <ColorIcon icon={icon} color={color} />
      <div className="min-w-0">
        <p className="truncate font-medium">{name || "Nomi"}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}

const TYPE_OPTIONS: { value: TxType; label: string }[] = [
  { value: "chiqim", label: "Chiqim" },
  { value: "kirim", label: "Kirim" },
];

/** Kategoriya qo'shish yoki tahrirlash */
export function CategoryForm({
  category,
  defaultType,
  onDone,
}: {
  category: CategoryItem | null;
  defaultType: TxType;
  onDone: () => void;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [type, setType] = useState<TxType>(category?.type ?? defaultType);
  const [icon, setIcon] = useState(category?.icon ?? "Ellipsis");
  const [color, setColor] = useState(category?.color ?? COLORS[5]);
  const [keywords, setKeywords] = useState(category?.keywords ?? []);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await saveCategory({ id: category?.id, name, type, icon, color, keywords });
      if (!result.ok) return setError(result.error);
      toast.success(category ? "Kategoriya saqlandi" : `"${name.trim()}" kategoriyasi qo'shildi`);
      onDone();
    });
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <DialogHeader>
        <DialogTitle>{category ? "Kategoriyani tahrirlash" : "Yangi kategoriya"}</DialogTitle>
        <DialogDescription>
          {category?.systemKey
            ? "Tizim kategoriyasi: nomi, ko'rinishi va kalit so'zlarini o'zgartirish mumkin."
            : "Nomi, turi, ikonka va rangi. Kalit so'zlar Telegram botda kategoriyani avtomatik topadi."}
        </DialogDescription>
      </DialogHeader>

      <FormError error={error} />

      <Preview icon={icon} color={color} name={name} hint={type === "kirim" ? "Kirim kategoriyasi" : "Chiqim kategoriyasi"} />

      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <div className="space-y-2">
          <Label htmlFor="category-name">Nomi</Label>
          <Input id="category-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoFocus />
        </div>
        <div className="space-y-2">
          <Label>Turi</Label>
          <Segmented value={type} options={TYPE_OPTIONS} onChange={setType} disabled={Boolean(category)} />
        </div>
      </div>
      {category && (
        <p className="-mt-2 text-xs text-muted-foreground">Turi o&apos;zgarmaydi — eski yozuvlar kirim yoki chiqimligicha qolishi uchun.</p>
      )}

      <div className="space-y-2">
        <Label>Ikonka</Label>
        <IconPicker value={icon} color={color} onChange={setIcon} />
      </div>

      <div className="space-y-2">
        <Label>Rang</Label>
        <ColorPicker value={color} onChange={setColor} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category-keywords">Bot uchun kalit so&apos;zlar</Label>
        <KeywordsInput id="category-keywords" value={keywords} onChange={setKeywords} />
        <p className="text-xs text-muted-foreground">
          Enter yoki vergul bilan qo&apos;shing. Botda &quot;45000 taksi&quot; deb yozilsa, &quot;taksi&quot; so&apos;zi bor kategoriya tanlanadi.
        </p>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Bekor qilish
        </Button>
        <Button type="submit" disabled={pending || !name.trim()} className="min-w-28">
          {pending && <Loader2 className="animate-spin" />}
          Saqlash
        </Button>
      </DialogFooter>
    </form>
  );
}

const KIND_OPTIONS = WALLET_KINDS.map((kind) => ({ value: kind, label: WALLET_KIND_LABELS[kind] }));
const KIND_ICONS: Record<WalletKind, string> = { naqd: "Banknote", karta: "CreditCard", boshqa: "Wallet" };

/** Hamyon qo'shish yoki tahrirlash */
export function WalletForm({ wallet, onDone }: { wallet: WalletItem | null; onDone: () => void }) {
  const [name, setName] = useState(wallet?.name ?? "");
  const [kind, setKind] = useState<WalletKind>(wallet?.kind ?? "karta");
  const [icon, setIcon] = useState(wallet?.icon ?? "CreditCard");
  const [color, setColor] = useState(wallet?.color ?? COLORS[6]);
  const [currency, setCurrency] = useState<Currency>(wallet?.currency ?? "UZS");
  const [initialBalance, setInitialBalance] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const changeCurrency = (next: Currency) => {
    // Yozilgan raqam saqlanadi, faqat birligi almashadi
    setInitialBalance((v) => toMinor(fromMinor(v, currency), next));
    setCurrency(next);
  };

  const changeKind = (next: WalletKind) => {
    // Ikonka hali tanlanmagan bo'lsa, turiga mosini qo'yamiz
    if (icon === KIND_ICONS[kind]) setIcon(KIND_ICONS[next]);
    setKind(next);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await saveWallet({
        id: wallet?.id,
        name,
        kind,
        currency,
        icon,
        color,
        initialBalance: wallet ? undefined : initialBalance,
      });
      if (!result.ok) return setError(result.error);
      toast.success(wallet ? "Hamyon saqlandi" : `"${name.trim()}" hamyoni qo'shildi`);
      onDone();
    });
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <DialogHeader>
        <DialogTitle>{wallet ? "Hamyonni tahrirlash" : "Yangi hamyon"}</DialogTitle>
        <DialogDescription>
          {wallet
            ? "Nomi, turi va ko'rinishi. Qoldiqni Budjet bo'limida o'zgartirasiz."
            : "Masalan: Visa karta, Dollar jamg'arma, Uydagi seyf."}
        </DialogDescription>
      </DialogHeader>

      <FormError error={error} />

      <Preview icon={icon} color={color} name={name} hint={WALLET_KIND_LABELS[kind]} />

      <div className="space-y-2">
        <Label htmlFor="wallet-name">Nomi</Label>
        <Input id="wallet-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoFocus />
      </div>

      <div className="space-y-2">
        <Label>Turi</Label>
        <Segmented value={kind} options={KIND_OPTIONS} onChange={changeKind} />
      </div>

      <div className="space-y-2">
        <Label>Valyuta</Label>
        {wallet ? (
          <p className="rounded-xl bg-muted/50 px-3 py-2 text-sm">
            {CURRENCY_META[wallet.currency].name}{" "}
            <span className="text-muted-foreground">· yaratilgandan keyin o&apos;zgarmaydi</span>
          </p>
        ) : (
          <CurrencyPicker value={currency} onChange={changeCurrency} />
        )}
      </div>

      {!wallet && (
        <div className="space-y-2">
          <Label htmlFor="wallet-balance">Hozir undagi pul</Label>
          <AmountInput id="wallet-balance" value={initialBalance} onChange={setInitialBalance} currency={currency} />
          <p className="text-xs text-muted-foreground">Bo&apos;sh hamyon bo&apos;lsa 0 qoldiring.</p>
        </div>
      )}

      <div className="space-y-2">
        <Label>Ikonka</Label>
        <IconPicker value={icon} color={color} onChange={setIcon} />
      </div>

      <div className="space-y-2">
        <Label>Rang</Label>
        <ColorPicker value={color} onChange={setColor} />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Bekor qilish
        </Button>
        <Button type="submit" disabled={pending || !name.trim()} className="min-w-28">
          {pending && <Loader2 className="animate-spin" />}
          Saqlash
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Ko'rinadigan belgi: so'm, $, €, ₮ (USDT), ₿ (bitkoin) */
const CURRENCY_GLYPHS: Record<Currency, string> = { UZS: "so'm", USD: "$", EUR: "€", USDT: "₮", BTC: "₿" };

/** Hamyon valyutasi: 5 ta kartochka — belgi, nomi */
function CurrencyPicker({ value, onChange }: { value: Currency; onChange: (currency: Currency) => void }) {
  return (
    <div role="radiogroup" aria-label="Valyuta" className="grid grid-cols-3 gap-2 sm:grid-cols-5">
      {CURRENCIES.map((c) => {
        const selected = c === value;
        return (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(c)}
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-xl border px-2 py-2.5 transition-[background-color,border-color,box-shadow,scale] duration-200 hover:bg-muted/60 active:scale-95",
              selected && "border-primary bg-primary/5 ring-2 ring-primary/30",
            )}
          >
            <span className={cn("font-heading leading-none font-medium", c === "UZS" ? "text-base" : "text-xl")}>
              {CURRENCY_GLYPHS[c]}
            </span>
            <span className="text-[11px] text-muted-foreground">{c === "UZS" ? "So'm" : c}</span>
          </button>
        );
      })}
    </div>
  );
}
