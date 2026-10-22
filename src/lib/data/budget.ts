import "server-only";
import { requireUser } from "@/lib/auth/dal";
import { balanceOf, sumsByWallet, totalBalance } from "@/lib/balances";
import { connectDB } from "@/lib/db";
import { currentMonthKey, monthLabel, monthRange, shiftMonth } from "@/lib/dates";
import { loadEntryOptions } from "@/lib/data/entries";
import { Category, Transaction, Wallet } from "@/lib/models";
import { percentChange } from "@/lib/money";
import { generateDueRecurring } from "@/lib/recurring";

const HISTORY_MONTHS = 12;

/** Foiz faqat boshlang'ich qoldiq musbat bo'lganda ma'noli (aks holda -279 000 → 11 mln "4087%" bo'lib chiqadi) */
function growthPercent(start: number, end: number) {
  return start > 0 ? percentChange(end, start) : null;
}

/** Dashboard uchun: barcha hamyonlardagi jami pul */
export async function getCurrentTotal() {
  await requireUser();
  await connectDB();
  return totalBalance();
}

export type BudgetOverview = Awaited<ReturnType<typeof getBudgetOverview>>;
export type WalletBalance = BudgetOverview["wallets"][number];
export type MonthHistory = BudgetOverview["history"][number];

/** Budjet sahifasi: jami pul, hamyonlar qoldig'i va oylar bo'yicha jamg'arma tarixi */
export async function getBudgetOverview() {
  await requireUser();
  await connectDB();
  await generateDueRecurring();

  const current = currentMonthKey();
  const { start: monthStart } = monthRange(current);

  const [wallets, allSums, monthSums, byMonth, salary, options] = await Promise.all([
    Wallet.find().sort({ order: 1, createdAt: 1 }).lean(),
    sumsByWallet(),
    sumsByWallet(monthStart),
    Transaction.aggregate<{ _id: { month: string; type: "kirim" | "chiqim" }; total: number }>([
      { $match: { deletedAt: null } },
      {
        $group: {
          _id: {
            month: { $dateToString: { format: "%Y-%m", date: "$occurredAt", timezone: "+05:00" } },
            type: "$type",
          },
          total: { $sum: "$amount" },
        },
      },
    ]),
    Category.findOne({ systemKey: "oylik" }, { _id: 1 }).lean(),
    loadEntryOptions(),
  ]);

  const walletRows = wallets.map((w) => {
    const sums = monthSums.get(w._id);
    return {
      id: String(w._id),
      name: w.name,
      kind: w.kind,
      icon: w.icon,
      color: w.color,
      archived: w.archived,
      initialBalance: w.initialBalance,
      balance: balanceOf(w.initialBalance, allSums.get(w._id)),
      monthIn: sums.kirim + sums.transferIn,
      monthOut: sums.chiqim + sums.transferOut,
    };
  });
  const total = walletRows.reduce((sum, w) => sum + w.balance, 0);
  const initialTotal = wallets.reduce((sum, w) => sum + w.initialBalance, 0);

  // Oylar bo'yicha kirim/chiqim; o'tkazmalar jami pulni o'zgartirmaydi
  const flows = new Map<string, { income: number; expense: number }>();
  for (const row of byMonth) {
    const entry = flows.get(row._id.month) ?? { income: 0, expense: 0 };
    if (row._id.type === "kirim") entry.income += row.total;
    else entry.expense += row.total;
    flows.set(row._id.month, entry);
  }

  const dataMonths = [...flows.keys()].filter((m) => m <= current).sort();
  const firstShown = [dataMonths[0] ?? current, shiftMonth(current, -(HISTORY_MONTHS - 1))].sort().at(-1)!;

  // Ko'rsatiladigan birinchi oy boshidagi qoldiq = boshlang'ich qoldiqlar + undan oldingi barcha oylar natijasi
  let running = initialTotal;
  for (const m of dataMonths) {
    if (m >= firstShown) break;
    const f = flows.get(m)!;
    running += f.income - f.expense;
  }

  const history = [];
  for (let m = firstShown; m <= current; m = shiftMonth(m, 1)) {
    const f = flows.get(m) ?? { income: 0, expense: 0 };
    const start = running;
    const end = start + f.income - f.expense;
    history.push({
      month: m,
      label: monthLabel(m),
      start,
      income: f.income,
      expense: f.expense,
      end,
      change: growthPercent(start, end),
    });
    running = end;
  }

  const thisMonth = history.at(-1)!;
  return {
    total,
    monthStartTotal: thisMonth.start,
    monthIncome: thisMonth.income,
    monthExpense: thisMonth.expense,
    monthChange: growthPercent(thisMonth.start, total),
    wallets: walletRows.filter((w) => !w.archived),
    history,
    /** Hali birorta hamyonga boshlang'ich qoldiq kiritilmagan */
    needsInitialBalances: wallets.every((w) => w.initialBalance === 0),
    salaryCategoryId: salary ? String(salary._id) : null,
    options,
  };
}
