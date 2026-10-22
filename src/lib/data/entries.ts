import "server-only";
import type { Types } from "mongoose";
import { requireUser } from "@/lib/auth/dal";
import { connectDB } from "@/lib/db";
import { monthRange } from "@/lib/dates";
import type { Entry, EntryFilters, EntryOptions, TransferEntry, TxEntry } from "@/lib/entries";
import { Category, Recurring, Transaction, Transfer, Wallet, type CategoryDoc, type WalletDoc } from "@/lib/models";
import { generateDueRecurring, nextRecurringDate } from "@/lib/recurring";

type WithId<T> = T & { _id: Types.ObjectId };
type Brief = { name: string; icon: string; color: string };

const MISSING: Brief = { name: "O'chirilgan", icon: "Ellipsis", color: "#64748b" };

async function loadLookups() {
  const [categories, wallets] = await Promise.all([
    Category.find().sort({ order: 1, createdAt: 1 }).lean(),
    Wallet.find().sort({ order: 1, createdAt: 1 }).lean(),
  ]);
  const brief = (doc: { name: string; icon: string; color: string }): Brief => ({
    name: doc.name,
    icon: doc.icon,
    color: doc.color,
  });
  return {
    categories,
    wallets,
    category: (id: unknown) => {
      const doc = categories.find((c) => c._id.equals(String(id)));
      return doc ? brief(doc) : MISSING;
    },
    wallet: (id: unknown) => {
      const doc = wallets.find((w) => w._id.equals(String(id)));
      return doc ? brief(doc) : MISSING;
    },
  };
}
type Lookups = Awaited<ReturnType<typeof loadLookups>>;

/** Qo'lda tanlash mumkin bo'lgan kategoriya va hamyonlar (qarz/kredit tizim kategoriyalarisiz) */
function selectableOptions(
  categories: WithId<CategoryDoc>[],
  wallets: WithId<WalletDoc>[],
): EntryOptions {
  return {
    categories: categories
      .filter((c) => !c.archived && (!c.systemKey || c.systemKey === "oylik"))
      .map((c) => ({ id: String(c._id), name: c.name, type: c.type, icon: c.icon, color: c.color })),
    wallets: wallets
      .filter((w) => !w.archived)
      .map((w) => ({ id: String(w._id), name: w.name, kind: w.kind, icon: w.icon, color: w.color })),
  };
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
export async function getEntriesPage(month: string, filters: EntryFilters) {
  await requireUser();
  await connectDB();
  await generateDueRecurring();

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

  return { entries, totals, options: selectableOptions(lookups.categories, lookups.wallets) };
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
  const entries = [...transactions.map((t) => toTxEntry(t, lookups)), ...transfers.map((t) => toTransferEntry(t, lookups))]
    .sort(byOccurredDesc)
    .slice(0, limit);
  return { entries, options: selectableOptions(lookups.categories, lookups.wallets) };
}

/** Savatcha: o'chirilgan yozuvlar, oxirgi o'chirilgani birinchi */
export async function getTrash() {
  await requireUser();
  await connectDB();
  const lookups = await loadLookups();
  const deleted = { deletedAt: { $ne: null } };
  const [transactions, transfers] = await Promise.all([
    findTransactions(deleted, 300, { deletedAt: -1 }),
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
  const lookups = await loadLookups();
  const items = await Recurring.find().sort({ active: -1, dayOfMonth: 1, createdAt: 1 }).lean();
  return {
    options: selectableOptions(lookups.categories, lookups.wallets),
    items: items.map((r) => ({
      id: String(r._id),
      name: r.name,
      type: r.type,
      amount: r.amount,
      categoryId: String(r.categoryId),
      category: lookups.category(r.categoryId),
      walletId: String(r.walletId),
      wallet: lookups.wallet(r.walletId),
      dayOfMonth: r.dayOfMonth,
      note: r.note,
      active: r.active,
      nextDate: r.active ? nextRecurringDate(r).toISOString() : null,
    })),
  };
}
