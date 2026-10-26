import "server-only";
import type { Types } from "mongoose";
import { readAsUser } from "@/lib/auth/dal";
import { totalBalance } from "@/lib/balances";
import { loadDebtOverview } from "@/lib/data/debts";
import { loadTopExpenses } from "@/lib/data/entries";
import {
  MONTH_NAMES,
  currentMonthKey,
  daysInMonth,
  monthLabel,
  monthRange,
  resolveMonthParam,
  shiftMonth,
  tashkentToday,
} from "@/lib/dates";
import { Category, Transaction } from "@/lib/models";
import { percentChange } from "@/lib/money";

const TASHKENT_TZ = "+05:00";
const TREND_MONTHS = 12;

export type Dashboard = Awaited<ReturnType<typeof getDashboard>>;

/** Faqat boshlang'ich qiymat musbat bo'lganda foiz ma'noli */
const growth = (current: number, previous: number) => (previous > 0 ? percentChange(current, previous) : null);

/** Shu vaqtdan keyingi barcha kirim − chiqim (oy oxiridagi qoldiqni topish uchun) */
async function netSince(date: Date) {
  const rows = await Transaction.aggregate<{ _id: "kirim" | "chiqim"; total: number }>([
    { $match: { deletedAt: null, occurredAt: { $gte: date } } },
    { $group: { _id: "$type", total: { $sum: "$amount" } } },
  ]);
  return rows.reduce((sum, r) => sum + (r._id === "kirim" ? r.total : -r.total), 0);
}

/** Dashboard: tanlangan oy ko'rsatkichlari, o'tgan oy bilan taqqoslash, kategoriyalar, trend va qarzlar */
export async function getDashboard(monthParam: unknown) {
  return readAsUser(() => loadDashboard(monthParam));
}

async function loadDashboard(monthParam: unknown) {
  const now = new Date();
  const month = resolveMonthParam(monthParam, now);
  const isCurrentMonth = month === currentMonthKey(now);
  const prev = shiftMonth(month, -1);
  const { start, end } = monthRange(month);
  const { start: prevStart } = monthRange(prev);
  const { start: trendStart } = monthRange(shiftMonth(month, -(TREND_MONTHS - 1)));

  const [byMonth, byCategory, byDay, categories, topExpenses, totalNow, afterEnd, afterStart, debts] =
    await Promise.all([
      Transaction.aggregate<{ _id: { month: string; type: "kirim" | "chiqim"; debt: boolean }; total: number }>([
        { $match: { deletedAt: null, occurredAt: { $gte: trendStart, $lt: end } } },
        {
          $group: {
            _id: {
              month: { $dateToString: { format: "%Y-%m", date: "$occurredAt", timezone: TASHKENT_TZ } },
              type: "$type",
              debt: { $ne: [{ $ifNull: ["$debtId", null] }, null] },
            },
            total: { $sum: "$amount" },
          },
        },
      ]),
      Transaction.aggregate<{ _id: { category: Types.ObjectId; current: boolean }; total: number }>([
        { $match: { deletedAt: null, type: "chiqim", occurredAt: { $gte: prevStart, $lt: end } } },
        {
          $group: {
            _id: { category: "$categoryId", current: { $gte: ["$occurredAt", start] } },
            total: { $sum: "$amount" },
          },
        },
      ]),
      Transaction.aggregate<{ _id: string; total: number }>([
        { $match: { deletedAt: null, type: "chiqim", occurredAt: { $gte: start, $lt: end } } },
        {
          $group: {
            _id: { $dateToString: { format: "%d", date: "$occurredAt", timezone: TASHKENT_TZ } },
            total: { $sum: "$amount" },
          },
        },
      ]),
      Category.find({}, { name: 1, icon: 1, color: 1, systemKey: 1 }).lean(),
      loadTopExpenses(start, end, 5),
      totalBalance(),
      netSince(end),
      netSince(start),
      loadDebtOverview(now),
    ]);

  // ---- Oylar bo'yicha kirim/chiqim (qarz bilan bog'liq qismi alohida) ----
  const sumFor = (m: string, type: "kirim" | "chiqim", onlyDebt = false) =>
    byMonth
      .filter((r) => r._id.month === m && r._id.type === type && (!onlyDebt || r._id.debt))
      .reduce((sum, r) => sum + r.total, 0);

  const income = sumFor(month, "kirim");
  const expense = sumFor(month, "chiqim");
  const prevIncome = sumFor(prev, "kirim");
  const prevExpense = sumFor(prev, "chiqim");

  const trend = Array.from({ length: TREND_MONTHS }, (_, i) => {
    const m = shiftMonth(month, i - (TREND_MONTHS - 1));
    return {
      month: m,
      short: MONTH_NAMES[Number(m.slice(5)) - 1].slice(0, 3),
      label: monthLabel(m),
      income: sumFor(m, "kirim"),
      expense: sumFor(m, "chiqim"),
    };
  });

  // ---- Jami budjet: oy oxiridagi (joriy oyda — hozirgi) qoldiq ----
  const budget = isCurrentMonth ? totalNow : totalNow - afterEnd;
  const prevBudget = totalNow - afterStart;

  // ---- Kategoriyalar bo'yicha chiqim ----
  const categoryTotals = new Map<string, { current: number; previous: number }>();
  for (const row of byCategory) {
    const key = String(row._id.category);
    const entry = categoryTotals.get(key) ?? { current: 0, previous: 0 };
    if (row._id.current) entry.current += row.total;
    else entry.previous += row.total;
    categoryTotals.set(key, entry);
  }
  const categoryRows = [...categoryTotals.entries()]
    .filter(([, v]) => v.current > 0)
    .map(([id, v]) => {
      const category = categories.find((c) => c._id.equals(id));
      return {
        id,
        name: category?.name ?? "O'chirilgan",
        icon: category?.icon ?? "Ellipsis",
        color: category?.color ?? "#64748b",
        isDebt: Boolean(category?.systemKey && category.systemKey !== "oylik"),
        amount: v.current,
        previous: v.previous,
        share: expense > 0 ? v.current / expense : 0,
        change: v.previous > 0 ? percentChange(v.current, v.previous) : null,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  // ---- Kunlik chiqim ----
  const totalDays = daysInMonth(month);
  const elapsedDays = isCurrentMonth ? tashkentToday(now).day : totalDays;
  const daily = Array.from({ length: totalDays }, (_, i) => {
    const day = i + 1;
    return {
      day,
      label: `${day} ${MONTH_NAMES[Number(month.slice(5)) - 1].toLowerCase()}`,
      amount: byDay.find((d) => Number(d._id) === day)?.total ?? 0,
      future: day > elapsedDays,
    };
  });

  return {
    month,
    monthLabel: monthLabel(month),
    prevLabel: monthLabel(prev),
    isCurrentMonth,
    income: { value: income, debt: sumFor(month, "kirim", true), change: growth(income, prevIncome) },
    expense: { value: expense, debt: sumFor(month, "chiqim", true), change: growth(expense, prevExpense) },
    net: { value: income - expense, previous: prevIncome - prevExpense },
    budget: { value: budget, change: growth(budget, prevBudget) },
    trend,
    categories: categoryRows,
    daily,
    dailyAverage: elapsedDays > 0 ? Math.round(expense / elapsedDays) : 0,
    topExpenses,
    debts,
  };
}
