// Kirim-chiqim sahifasi uchun umumiy turlar (server va brauzer uchun)
import { dayKey, formatDayHeading } from "@/lib/dates";
import type { Source, TxType, WalletKind } from "@/lib/domain";

export type CategoryOption = { id: string; name: string; type: TxType; icon: string; color: string };
export type WalletOption = { id: string; name: string; kind: WalletKind; icon: string; color: string };
export type EntryOptions = { categories: CategoryOption[]; wallets: WalletOption[] };

type Brief = { name: string; icon: string; color: string };

type EntryBase = {
  id: string;
  amount: number;
  note: string;
  /** ISO formatida — mijoz komponentlariga uzatish uchun */
  occurredAt: string;
  createdAt: string;
  deletedAt: string | null;
  source: Source;
};

export type TxEntry = EntryBase & {
  kind: "tx";
  type: TxType;
  categoryId: string;
  category: Brief;
  walletId: string;
  wallet: Brief;
  debtId: string | null;
  recurringId: string | null;
};

export type TransferEntry = EntryBase & {
  kind: "transfer";
  fromWalletId: string;
  fromWallet: Brief;
  toWalletId: string;
  toWallet: Brief;
};

export type Entry = TxEntry | TransferEntry;

export type DayGroup = { key: string; heading: string; income: number; expense: number; entries: Entry[] };

/** Yozuvlarni Toshkent vaqti bo'yicha kunlarga ajratadi (yozuvlar yangisi birinchi tartibda kelishi kerak) */
export function groupByDay(entries: Entry[], now = new Date()): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const entry of entries) {
    const key = dayKey(new Date(entry.occurredAt));
    let group = groups.at(-1);
    if (group?.key !== key) {
      group = { key, heading: formatDayHeading(key, now), income: 0, expense: 0, entries: [] };
      groups.push(group);
    }
    group.entries.push(entry);
    if (entry.kind === "tx") {
      if (entry.type === "kirim") group.income += entry.amount;
      else group.expense += entry.amount;
    }
  }
  return groups;
}

// ---- Filtrlar (URL parametrlari) ----

export const ENTRY_TYPE_FILTERS = ["kirim", "chiqim", "otkazma"] as const;
export type EntryTypeFilter = (typeof ENTRY_TYPE_FILTERS)[number];

export type EntryFilters = {
  type?: EntryTypeFilter;
  categoryId?: string;
  walletId?: string;
  source?: Source;
  q?: string;
};

/** URL parametrlari nomlari: ?tur=chiqim&kategoriya=...&hamyon=...&manba=telegram&q=taksi */
export const FILTER_PARAMS = {
  type: "tur",
  categoryId: "kategoriya",
  walletId: "hamyon",
  source: "manba",
  q: "q",
} as const satisfies Record<keyof EntryFilters, string>;

const OBJECT_ID_RE = /^[0-9a-f]{24}$/i;

export function parseEntryFilters(params: Record<string, string | string[] | undefined>): EntryFilters {
  const get = (key: string) => {
    const value = params[key];
    return typeof value === "string" ? value.trim() : undefined;
  };
  const type = get(FILTER_PARAMS.type);
  const categoryId = get(FILTER_PARAMS.categoryId);
  const walletId = get(FILTER_PARAMS.walletId);
  const source = get(FILTER_PARAMS.source);
  const q = get(FILTER_PARAMS.q)?.slice(0, 100);

  return {
    type: ENTRY_TYPE_FILTERS.includes(type as EntryTypeFilter) ? (type as EntryTypeFilter) : undefined,
    categoryId: categoryId && OBJECT_ID_RE.test(categoryId) ? categoryId : undefined,
    walletId: walletId && OBJECT_ID_RE.test(walletId) ? walletId : undefined,
    source: source === "web" || source === "telegram" || source === "auto" ? source : undefined,
    q: q || undefined,
  };
}

export function hasActiveFilters(filters: EntryFilters) {
  return Object.values(filters).some(Boolean);
}
