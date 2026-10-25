import "server-only";
import type { Types } from "mongoose";
import { requireUser } from "@/lib/auth/dal";
import { currencyOf, minorToUzs, type Currency, type Rates } from "@/lib/currency";
import { connectDB } from "@/lib/db";
import { monthRange, resolveMonthParam } from "@/lib/dates";
import type { Entry, EntryFilters, EntryOptions, TransferEntry, TxEntry } from "@/lib/entries";
import { Category, Recurring, Transaction, Transfer, Wallet, type CategoryDoc, type WalletDoc } from "@/lib/models";
import { getRates } from "@/lib/rates";
import { generateDueRecurring, nextRecurringDate } from "@/lib/recurring";

type WithId<T> = T & { _id: Types.ObjectId };
type Brief = { name: string; icon: string; color: string };

const MISSING: Brief = { name: "O'chirilgan", icon: "Ellipsis", color: "#64748b" };
const MISSING_WALLET = { ...MISSING, currency: "UZS" as Currency };

async function loadLookups() {
  const [categories, wallets, { rates }] = await Promise.all([
    Category.find().sort({ order: 1, createdAt: 1 }).lean(),
    Wallet.find().sort({ order: 1, createdAt: 1 }).lean(),
    getRates(),
  ]);
  const brief = (doc: { name: string; icon: string; color: string }): Brief => ({
    name: doc.name,
    icon: doc.icon,
    color: doc.color,
  });
  return {
    categories,
    wallets,
    rates,
    category: (id: unknown) => {
      const doc = categories.find((c) => c._id.equals(String(id)));
      return doc ? brief(doc) : MISSING;
    },
    wallet: (id: unknown) => {
      const doc = wallets.find((w) => w._id.equals(String(id)));
      return doc ? { ...brief(doc), currency: currencyOf(doc) } : MISSING_WALLET;
    },
  };
}
type Lookups = Awaited<ReturnType<typeof loadLookups>>;

/** Qo'lda tanlash mumkin bo'lgan kategoriya va hamyonlar (qarz/kredit tizim kategoriyalarisiz) */
function selectableOptions(
  categories: WithId<CategoryDoc>[],
  wallets: WithId<WalletDoc>[],
  rates: Rates,
): EntryOptions {
  const active = wallets.filter((w) => !w.archived);
  const used = [...new Set(active.map(currencyOf))].filter((c) => c !== "UZS");
  return {
    rates: Object.fromEntries(used.map((c) => [c, rates[c]])),
    categories: categories
      .filter((c) => !c.archived && (!c.systemKey || c.systemKey === "oylik"))
      .map((c) => ({ id: String(c._id), name: c.name, type: c.type, icon: c.icon, color: c.color })),
    wallets: active.map((w) => ({
      id: String(w._id),
      name: w.name,
      kind: w.kind,
      icon: w.icon,
      color: w.color,
      currency: currencyOf(w),
    })),
  };
}

/** Yozuv oynasi uchun kategoriya va hamyonlar (seans chaqiruvchi tomonda tekshirilgan bo'lishi kerak) */
export async function loadEntryOptions() {
  const { categories, wallets, rates } = await loadLookups();
  return selectableOptions(categories, wallets, rates);
}

type TxLean = Awaited<ReturnType<typeof findTransactions>>[number];
type TransferLean = Awaited<ReturnType<typeof findTransfers>>[number];

const findTransactions = (filter: Record<string, unknown>, limit: number, sort: Record<string, 1 | -1>) =>
  Transaction.find(filter).sort(sort).limit(limit).lean();
const findTransfers = (filter: Record<string, unknown>, limit: number, sort: Record<string, 1 | -1>) =>
  Transfer.find(filter).sort(sort).limit(limit).lean();

function toTxEntry(doc: TxLean, lookups: Lookups): TxEntry {
  return {
    kind: "tx",
    id: String(doc._id),
    type: doc.type,
    amount: doc.amount,
    note: doc.note,
    occurredAt: doc.occurredAt.toISOString(),
    createdAt: doc.createdAt.toISOString(),
    deletedAt: doc.deletedAt?.toISOString() ?? null,
    source: doc.source,
    categoryId: String(doc.categoryId),
    category: lookups.category(doc.categoryId),
    walletId: String(doc.walletId),
    wallet: lookups.wallet(doc.walletId),
    debtId: doc.debtId ? String(doc.debtId) : null,
    recurringId: doc.recurringId ? String(doc.recurringId) : null,
    currency: currencyOf(doc),
    originalAmount: doc.originalAmount ?? null,
    rate: doc.rate ?? null,
  };
}

function toTransferEntry(doc: TransferLean, lookups: Lookups): TransferEntry {
  return {
    kind: "transfer",
    id: String(doc._id),
    amount: doc.amount,
    note: doc.note,
    occurredAt: doc.occurredAt.toISOString(),
    createdAt: doc.createdAt.toISOString(),
    deletedAt: doc.deletedAt?.toISOString() ?? null,
    source: doc.source,
    fromWalletId: String(doc.fromWalletId),
    fromWallet: lookups.wallet(doc.fromWalletId),
    toWalletId: String(doc.toWalletId),
    toWallet: lookups.wallet(doc.toWalletId),
    toAmount: doc.toAmount ?? doc.amount,
  };
}

const byOccurredDesc = (a: Entry, b: Entry) => b.occurredAt.localeCompare(a.occurredAt);

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function monthTotals(start: Date, end: Date) {
  const rows = await Transaction.aggregate<{ _id: "kirim" | "chiqim"; total: number; count: number }>([
    { $match: { deletedAt: null, occurredAt: { $gte: start, $lt: end } } },
    { $group: { _id: "$type", total: { $sum: "$amount" }, count: { $sum: 1 } } },
  ]);
  const income = rows.find((r) => r._id === "kirim");
  const expense = rows.find((r) => r._id === "chiqim");
  return {
    income: income?.total ?? 0,
    expense: expense?.total ?? 0,
    net: (income?.total ?? 0) - (expense?.total ?? 0),
    count: (income?.count ?? 0) + (expense?.count ?? 0),
  };
}

/** Kirim-chiqim sahifasi: tanlangan oy yozuvlari (filtr bilan), oy jami va forma uchun ro'yxatlar */
export async function getEntriesPage(monthParam: unknown, filters: EntryFilters) {
  await requireUser();
  await connectDB();
  await generateDueRecurring();

  // Oy seans tekshiruvidan keyin aniqlanadi — joriy vaqt faqat so'rov paytida o'qiladi
  const month = resolveMonthParam(monthParam);
  const { start, end } = monthRange(month);
  const lookups = await loadLookups();
  const inMonth = { deletedAt: null, occurredAt: { $gte: start, $lt: end } };
  const search = filters.q ? new RegExp(escapeRegex(filters.q), "i") : null;

  const txFilter: Record<string, unknown> = { ...inMonth };
  if (filters.type === "kirim" || filters.type === "chiqim") txFilter.type = filters.type;
  if (filters.categoryId) txFilter.categoryId = filters.categoryId;
  if (filters.walletId) txFilter.walletId = filters.walletId;
  if (filters.source) txFilter.source = filters.source;
  if (search) {
    const categoryIds = lookups.categories.filter((c) => search.test(c.name)).map((c) => c._id);
    txFilter.$or = [{ note: search }, { categoryId: { $in: categoryIds } }];
  }

  // O'tkazmalarda kategoriya yo'q — kategoriya yoki kirim/chiqim tanlansa ular ko'rsatilmaydi
  const includeTransfers = !filters.categoryId && (!filters.type || filters.type === "otkazma");
  const transferFilter: Record<string, unknown> = { ...inMonth };
  if (filters.walletId) transferFilter.$or = [{ fromWalletId: filters.walletId }, { toWalletId: filters.walletId }];
  if (filters.source) transferFilter.source = filters.source;
  if (search) transferFilter.note = search;

  const [transactions, transfers, totals] = await Promise.all([
    filters.type === "otkazma" ? [] : findTransactions(txFilter, 1000, { occurredAt: -1 }),
    includeTransfers ? findTransfers(transferFilter, 500, { occurredAt: -1 }) : [],
    monthTotals(start, end),
  ]);

  const entries: Entry[] = [
    ...transactions.map((t) => toTxEntry(t, lookups)),
    ...transfers.map((t) => toTransferEntry(t, lookups)),
  ].sort(byOccurredDesc);

  return { entries, totals, options: selectableOptions(lookups.categories, lookups.wallets, lookups.rates) };
}

/** Dashboard uchun oxirgi yozuvlar (va tezkor qo'shish oynasi uchun ro'yxatlar) */
export async function getRecentEntries(limit = 6) {
  await requireUser();
  await connectDB();
  await generateDueRecurring();
  const lookups = await loadLookups();
  const [transactions, transfers] = await Promise.all([
    findTransactions({ deletedAt: null }, limit, { occurredAt: -1 }),
    findTransfers({ deletedAt: null }, limit, { occurredAt: -1 }),
  ]);
  const entries = [
    ...transactions.map((t) => toTxEntry(t, lookups)),
    ...transfers.map((t) => toTransferEntry(t, lookups)),
  ]
    .sort(byOccurredDesc)
    .slice(0, limit);
  return { entries, options: selectableOptions(lookups.categories, lookups.wallets, lookups.rates) };
}

/** Oyning eng katta chiqimlari (seans chaqiruvchi tomonda tekshirilgan bo'lishi kerak) */
export async function loadTopExpenses(start: Date, end: Date, limit = 5) {
  const lookups = await loadLookups();
  const rows = await findTransactions(
    { deletedAt: null, type: "chiqim", occurredAt: { $gte: start, $lt: end } },
    limit,
    { amount: -1, occurredAt: -1 },
  );
  return rows.map((t) => toTxEntry(t, lookups));
}

/** Savatcha: o'chirilgan yozuvlar, oxirgi o'chirilgani birinchi */
export async function getTrash() {
  await requireUser();
  await connectDB();
  const lookups = await loadLookups();
  const deleted = { deletedAt: { $ne: null } };
  const [transactions, transfers] = await Promise.all([
    // Qarz bilan birga o'chirilgan yozuvlar savatchada ko'rsatilmaydi — ular qarzning bir qismi
    findTransactions({ ...deleted, debtId: null }, 300, { deletedAt: -1 }),
    findTransfers(deleted, 300, { deletedAt: -1 }),
  ]);
  return [...transactions.map((t) => toTxEntry(t, lookups)), ...transfers.map((t) => toTransferEntry(t, lookups))].sort(
    (a, b) => (b.deletedAt ?? "").localeCompare(a.deletedAt ?? ""),
  );
}

export type RecurringItem = Awaited<ReturnType<typeof getRecurringPage>>["items"][number];

export async function getRecurringPage() {
  await requireUser();
  await connectDB();
  await generateDueRecurring();
  const [lookups, items] = await Promise.all([
    loadLookups(),
    Recurring.find().sort({ active: -1, dayOfMonth: 1, createdAt: 1 }).lean(),
  ]);
  const { rates } = lookups;
  return {
    options: selectableOptions(lookups.categories, lookups.wallets, lookups.rates),
    items: items.map((r) => {
      const wallet = lookups.wallet(r.walletId);
      return {
        id: String(r._id),
        name: r.name,
        type: r.type,
        /** Hamyon valyutasida (eng kichik birlikda); amountUzs — bugungi kurs bilan */
        amount: r.amount,
        amountUzs: minorToUzs(r.amount, wallet.currency, rates[wallet.currency]),
        categoryId: String(r.categoryId),
        category: lookups.category(r.categoryId),
        walletId: String(r.walletId),
        wallet,
        dayOfMonth: r.dayOfMonth,
        note: r.note,
        active: r.active,
        nextDate: r.active ? nextRecurringDate(r).toISOString() : null,
      };
    }),
  };
}
