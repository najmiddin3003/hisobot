import "server-only";
import type { Types } from "mongoose";
import { balanceOf, sumsByWallet } from "@/lib/balances";
import {
  currentMonthKey,
  daysInMonth,
  formatDate,
  formatDateTime,
  monthLabel,
  monthRange,
  shiftMonth,
  tashkentToday,
} from "@/lib/dates";
import { calcDebt } from "@/lib/debts";
import { Category, Debt, Recurring, Transaction, Wallet } from "@/lib/models";
import { percentChange } from "@/lib/money";
import { nextRecurringDate } from "@/lib/recurring";

// AI yordamchi uchun bazadan FAQAT o'qish. Bu fayldagi funksiyalar hech narsani o'zgartirmaydi.
// Seans chaqiruvchi tomonda (API route) tekshiriladi.

const TZ = "+05:00";

type TxType = "kirim" | "chiqim";

/** Kategoriya va hamyon nomlari; qarz/kredit tizim kategoriyalari belgilanadi */
async function lookups() {
  const [categories, wallets] = await Promise.all([
    Category.find({}, { name: 1, type: 1, systemKey: 1 }).lean(),
    Wallet.find({}, { name: 1, kind: 1, initialBalance: 1, archived: 1 }).lean(),
  ]);
  const category = (id: unknown) => categories.find((c) => c._id.equals(String(id)));
  return {
    categories,
    wallets,
    categoryName: (id: unknown) => category(id)?.name ?? "O'chirilgan kategoriya",
    /** Qarz olish/berish/qaytarish va kredit — iste'mol emas, pul harakati */
    isDebtCategory: (id: unknown) => {
      const key = category(id)?.systemKey;
      return Boolean(key && key !== "oylik");
    },
    walletName: (id: unknown) => wallets.find((w) => w._id.equals(String(id)))?.name ?? "O'chirilgan hamyon",
  };
}

const share = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 1000) / 10 : 0);
const change = (current: number, previous: number) => {
  const percent = previous > 0 ? percentChange(current, previous) : null;
  return percent === null ? null : Math.round(percent * 10) / 10;
};

/** Bitta oyning to'liq hisoboti: kategoriyalar, hamyonlar, eng katta chiqimlar va o'tgan oy bilan taqqoslash */
export async function monthSummary(month: string, now: Date) {
  const look = await lookups();
  const prev = shiftMonth(month, -1);
  const { start, end } = monthRange(month);
  const { start: prevStart } = monthRange(prev);
  const isCurrent = month === currentMonthKey(now);

  const [byCategory, byWallet, biggest] = await Promise.all([
    Transaction.aggregate<{
      _id: { category: Types.ObjectId; type: TxType; current: boolean };
      total: number;
      count: number;
    }>([
      { $match: { deletedAt: null, occurredAt: { $gte: prevStart, $lt: end } } },
      {
        $group: {
          _id: { category: "$categoryId", type: "$type", current: { $gte: ["$occurredAt", start] } },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]),
    Transaction.aggregate<{ _id: { wallet: Types.ObjectId; type: TxType }; total: number }>([
      { $match: { deletedAt: null, occurredAt: { $gte: start, $lt: end } } },
      { $group: { _id: { wallet: "$walletId", type: "$type" }, total: { $sum: "$amount" } } },
    ]),
    Transaction.find({ deletedAt: null, type: "chiqim", occurredAt: { $gte: start, $lt: end } })
      .sort({ amount: -1, occurredAt: -1 })
      .limit(10)
      .lean(),
  ]);

  const rows = byCategory.map((r) => ({
    id: String(r._id.category),
    type: r._id.type,
    current: r._id.current,
    total: r.total,
    count: r.count,
  }));
  const sum = (type: TxType, current: boolean, debt?: boolean) =>
    rows
      .filter((r) => r.type === type && r.current === current && (debt === undefined || look.isDebtCategory(r.id) === debt))
      .reduce((s, r) => s + r.total, 0);

  const categoryRows = (type: TxType) => {
    const ids = [...new Set(rows.filter((r) => r.type === type && r.current).map((r) => r.id))];
    const total = sum(type, true);
    return ids
      .map((id) => {
        const current = rows.find((r) => r.id === id && r.type === type && r.current);
        const previous = rows.find((r) => r.id === id && r.type === type && !r.current)?.total ?? 0;
        const amount = current?.total ?? 0;
        return {
          category: look.categoryName(id),
          amount,
          count: current?.count ?? 0,
          sharePercent: share(amount, total),
          previousMonth: previous,
          changePercent: change(amount, previous),
          debtRelated: look.isDebtCategory(id),
        };
      })
      .sort((a, b) => b.amount - a.amount);
  };

  const income = sum("kirim", true);
  const expense = sum("chiqim", true);
  const regularExpense = sum("chiqim", true, false);
  const prevRegularExpense = sum("chiqim", false, false);
  const totalDays = daysInMonth(month);
  const daysPassed = isCurrent ? tashkentToday(now).day : totalDays;

  const walletIds = [...new Set(byWallet.map((r) => String(r._id.wallet)))];

  return {
    month,
    label: monthLabel(month),
    isCurrentMonth: isCurrent,
    daysPassed,
    daysInMonth: totalDays,
    income: {
      total: income,
      debtRelated: sum("kirim", true, true),
      previousMonth: sum("kirim", false),
      changePercent: change(income, sum("kirim", false)),
    },
    expense: {
      total: expense,
      /** Qarz berish, qarz qaytarish va kredit to'lovlari */
      debtRelated: sum("chiqim", true, true),
      /** Qarz/kreditsiz haqiqiy xarajatlar */
      regular: regularExpense,
      regularPreviousMonth: prevRegularExpense,
      regularChangePercent: change(regularExpense, prevRegularExpense),
      dailyAverageRegular: daysPassed > 0 ? Math.round(regularExpense / daysPassed) : 0,
    },
    net: income - expense,
    expenseByCategory: categoryRows("chiqim"),
    incomeByCategory: categoryRows("kirim"),
    byWallet: walletIds.map((id) => ({
      wallet: look.walletName(id),
      income: byWallet.find((r) => String(r._id.wallet) === id && r._id.type === "kirim")?.total ?? 0,
      expense: byWallet.find((r) => String(r._id.wallet) === id && r._id.type === "chiqim")?.total ?? 0,
    })),
    biggestExpenses: biggest.map((t) => ({
      date: formatDateTime(t.occurredAt),
      amount: t.amount,
      category: look.categoryName(t.categoryId),
      note: t.note || null,
      wallet: look.walletName(t.walletId),
      debtRelated: look.isDebtCategory(t.categoryId),
    })),
  };
}

const MAX_TREND_MONTHS = 24;
const TREND_CATEGORIES = 10;

/** Bir necha oy bo'yicha kirim/chiqim va eng katta chiqim kategoriyalarining oyma-oy o'zgarishi */
export async function monthsTrend(endMonth: string, count: number) {
  const months = Math.min(Math.max(count, 2), MAX_TREND_MONTHS);
  const first = shiftMonth(endMonth, -(months - 1));
  const { start } = monthRange(first);
  const { end } = monthRange(endMonth);
  const look = await lookups();

  const rows = await Transaction.aggregate<{
    _id: { month: string; type: TxType; category: Types.ObjectId };
    total: number;
  }>([
    { $match: { deletedAt: null, occurredAt: { $gte: start, $lt: end } } },
    {
      $group: {
        _id: {
          month: { $dateToString: { format: "%Y-%m", date: "$occurredAt", timezone: TZ } },
          type: "$type",
          category: "$categoryId",
        },
        total: { $sum: "$amount" },
      },
    },
  ]);

  const keys = Array.from({ length: months }, (_, i) => shiftMonth(first, i));
  const total = (m: string, type: TxType, regularOnly = false) =>
    rows
      .filter((r) => r._id.month === m && r._id.type === type && (!regularOnly || !look.isDebtCategory(r._id.category)))
      .reduce((s, r) => s + r.total, 0);

  // Butun davr bo'yicha eng katta (qarzsiz) chiqim kategoriyalari
  const categoryTotals = new Map<string, number>();
  for (const r of rows) {
    if (r._id.type !== "chiqim" || look.isDebtCategory(r._id.category)) continue;
    const id = String(r._id.category);
    categoryTotals.set(id, (categoryTotals.get(id) ?? 0) + r.total);
  }
  const topCategories = [...categoryTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, TREND_CATEGORIES);

  return {
    months: keys.map((m) => {
      const income = total(m, "kirim");
      const expense = total(m, "chiqim");
      return { month: m, label: monthLabel(m), income, expense, regularExpense: total(m, "chiqim", true), net: income - expense };
    }),
    topExpenseCategories: topCategories.map(([id, sum]) => ({
      category: look.categoryName(id),
      total: sum,
      byMonth: Object.fromEntries(
        keys.map((m) => [
          m,
          rows
            .filter((r) => r._id.month === m && r._id.type === "chiqim" && String(r._id.category) === id)
            .reduce((s, r) => s + r.total, 0),
        ]),
      ),
    })),
  };
}

export type EntrySearch = {
  month?: string;
  from?: Date;
  to?: Date;
  type?: TxType;
  category?: string;
  text?: string;
  minAmount?: number;
  limit: number;
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Yozuvlarni qidirish: davr, tur, kategoriya nomi, izoh va summa bo'yicha; jami summa barcha mosliklar bo'yicha */
export async function searchEntries(query: EntrySearch) {
  const look = await lookups();
  const filter: Record<string, unknown> = { deletedAt: null };

  const range: Record<string, Date> = {};
  if (query.month) {
    const { start, end } = monthRange(query.month);
    range.$gte = start;
    range.$lt = end;
  }
  if (query.from) range.$gte = query.from;
  if (query.to) range.$lt = query.to;
  if (Object.keys(range).length) filter.occurredAt = range;
  if (query.type) filter.type = query.type;
  if (query.minAmount) filter.amount = { $gte: query.minAmount };
  if (query.text) filter.note = { $regex: escapeRegex(query.text), $options: "i" };
  if (query.category) {
    const re = new RegExp(escapeRegex(query.category), "i");
    const ids = look.categories.filter((c) => re.test(c.name)).map((c) => c._id);
    if (ids.length === 0) {
      return {
        error: `"${query.category}" nomli kategoriya topilmadi`,
        availableCategories: look.categories.map((c) => `${c.name} (${c.type})`),
      };
    }
    filter.categoryId = { $in: ids };
  }

  const [items, totals] = await Promise.all([
    Transaction.find(filter).sort({ occurredAt: -1 }).limit(query.limit).lean(),
    Transaction.aggregate<{ _id: TxType; total: number; count: number }>([
      { $match: filter },
      { $group: { _id: "$type", total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]),
  ]);

  return {
    matched: {
      count: totals.reduce((s, t) => s + t.count, 0),
      income: totals.find((t) => t._id === "kirim")?.total ?? 0,
      expense: totals.find((t) => t._id === "chiqim")?.total ?? 0,
    },
    shown: items.length,
    entries: items.map((t) => ({
      date: formatDateTime(t.occurredAt),
      type: t.type,
      amount: t.amount,
      category: look.categoryName(t.categoryId),
      wallet: look.walletName(t.walletId),
      note: t.note || null,
      source: t.source,
      recurring: Boolean(t.recurringId),
    })),
  };
}

const BUDGET_HISTORY_MONTHS = 6;

/** Hamyonlar qoldig'i, jami pul va oxirgi oylarda jamg'arma qanday o'zgargani */
export async function budgetState(now: Date) {
  const current = currentMonthKey(now);
  const first = shiftMonth(current, -(BUDGET_HISTORY_MONTHS - 1));
  const { start } = monthRange(first);

  const [wallets, sums, flows] = await Promise.all([
    Wallet.find().sort({ order: 1, createdAt: 1 }).lean(),
    sumsByWallet(),
    Transaction.aggregate<{ _id: { month: string; type: TxType }; total: number }>([
      { $match: { deletedAt: null, occurredAt: { $gte: start } } },
      {
        $group: {
          _id: { month: { $dateToString: { format: "%Y-%m", date: "$occurredAt", timezone: TZ } }, type: "$type" },
          total: { $sum: "$amount" },
        },
      },
    ]),
  ]);

  const rows = wallets.map((w) => ({
    wallet: w.name,
    kind: w.kind,
    balance: balanceOf(w.initialBalance, sums.get(w._id)),
    archived: w.archived,
  }));
  const total = rows.reduce((s, w) => s + w.balance, 0);
  const net = (m: string) =>
    flows
      .filter((f) => f._id.month === m)
      .reduce((s, f) => s + (f._id.type === "kirim" ? f.total : -f.total), 0);

  // Oxirgi oydan orqaga: oy oxiridagi qoldiq = keyingi oy boshidagi qoldiq
  const history = [];
  let endBalance = total;
  for (let i = 0; i < BUDGET_HISTORY_MONTHS; i++) {
    const m = shiftMonth(current, -i);
    const startBalance = endBalance - net(m);
    history.unshift({
      month: m,
      label: monthLabel(m),
      startBalance,
      endBalance: m === current ? null : endBalance,
      currentBalance: m === current ? endBalance : undefined,
      saved: endBalance - startBalance,
    });
    endBalance = startBalance;
  }

  return {
    total,
    wallets: rows.filter((w) => !w.archived || w.balance !== 0),
    noInitialBalances: wallets.every((w) => w.initialBalance === 0),
    history,
  };
}

/** Ochiq qarzlar (men qarzdorman), xaqlar (menga qarzdor) va kreditlar */
export async function debtsState(now: Date) {
  const [debts, closedCount] = await Promise.all([
    Debt.find({ deletedAt: null, status: "ochiq" }).sort({ startedAt: 1 }).lean(),
    Debt.countDocuments({ deletedAt: null, status: "yopilgan" }),
  ]);
  const payments = await Transaction.aggregate<{ _id: Types.ObjectId; total: number; last: Date }>([
    { $match: { debtId: { $in: debts.map((d) => d._id) }, debtRole: "tolov", deletedAt: null } },
    { $group: { _id: "$debtId", total: { $sum: "$amount" }, last: { $max: "$occurredAt" } } },
  ]);

  const items = debts.map((debt) => {
    const paidRow = payments.find((p) => debt._id.equals(p._id));
    const calc = calcDebt(debt, paidRow?.total ?? 0, now);
    return {
      direction: debt.direction === "olingan" ? "men qarzdorman" : "menga qarzdor (xaq)",
      kind: debt.kind,
      counterparty: debt.counterparty,
      startedAt: formatDate(debt.startedAt),
      total: calc.total,
      paid: calc.paid,
      remaining: calc.remaining,
      monthlyPayment: debt.monthlyPayment ?? null,
      termMonths: debt.termMonths ?? null,
      remainingMonths: calc.remainingMonths,
      nextDue: calc.nextDue ? formatDate(calc.nextDue) : null,
      daysToDue: calc.daysToDue,
      overdue: calc.overdue,
      lastPayment: paidRow ? formatDate(paidRow.last) : null,
      note: debt.note || null,
    };
  });
  const open = items.filter((i) => i.remaining > 0);
  const sumOf = (list: typeof open) => list.reduce((s, i) => s + i.remaining, 0);
  const iOwe = open.filter((i) => i.direction === "men qarzdorman");

  return {
    totals: {
      iOwe: sumOf(iOwe),
      owedToMe: sumOf(open.filter((i) => i.direction !== "men qarzdorman")),
      monthlyCreditPayments: iOwe
        .filter((i) => i.kind === "kredit")
        .reduce((s, i) => s + Math.min(i.monthlyPayment ?? 0, i.remaining), 0),
      overdueCount: open.filter((i) => i.overdue).length,
      closedCount,
    },
    items: open,
  };
}

/** Har oy avtomatik yoziladigan to'lovlar (ijara, internet, obunalar...) */
export async function recurringState() {
  const look = await lookups();
  const items = await Recurring.find().sort({ active: -1, dayOfMonth: 1 }).lean();
  const active = items.filter((r) => r.active);
  return {
    monthlyExpense: active.filter((r) => r.type === "chiqim").reduce((s, r) => s + r.amount, 0),
    monthlyIncome: active.filter((r) => r.type === "kirim").reduce((s, r) => s + r.amount, 0),
    items: items.map((r) => ({
      name: r.name,
      type: r.type,
      amount: r.amount,
      category: look.categoryName(r.categoryId),
      wallet: look.walletName(r.walletId),
      dayOfMonth: r.dayOfMonth,
      active: r.active,
      nextDate: r.active ? formatDate(nextRecurringDate(r)) : null,
      note: r.note || null,
    })),
  };
}

/** Oyda nechta yozuv bor (bo'sh oyni tahlil qilmaslik uchun) */
export async function countMonthEntries(month: string) {
  const { start, end } = monthRange(month);
  return Transaction.countDocuments({ deletedAt: null, occurredAt: { $gte: start, $lt: end } });
}
