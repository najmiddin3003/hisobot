import "server-only";
import { readAsUser } from "@/lib/auth/dal";
import { balanceOf, sumsByWallet } from "@/lib/balances";
import { currencyOf, minorToUzs } from "@/lib/currency";
import { currentMonthKey, monthLabel, monthRange, shiftMonth } from "@/lib/dates";
import { loadEntryOptions } from "@/lib/data/entries";
import { Category, Transaction, Wallet } from "@/lib/models";
import { percentChange } from "@/lib/money";
import { getRates } from "@/lib/rates";

const HISTORY_MONTHS = 12;

/** Foiz faqat boshlang'ich qoldiq musbat bo'lganda ma'noli (aks holda -279 000 → 11 mln "4087%" bo'lib chiqadi) */
function growthPercent(start: number, end: number) {
  return start > 0 ? percentChange(end, start) : null;
}

export type BudgetOverview = Awaited<ReturnType<typeof getBudgetOverview>>;
export type WalletBalance = BudgetOverview["wallets"][number];
export type MonthHistory = BudgetOverview["history"][number];

/** Budjet sahifasi: jami pul, hamyonlar qoldig'i va oylar bo'yicha jamg'arma tarixi */
export async function getBudgetOverview() {
  return readAsUser(async () => {
    const current = currentMonthKey();
    const { start: monthStart } = monthRange(current);

    const [wallets, allSums, monthSums, byMonth, salary, options, ratesSnapshot] = await Promise.all([
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
      getRates(),
    ]);
    const { rates } = ratesSnapshot;

    // Hamyon summalari o'z valyutasida (eng kichik birlikda), balanceUzs — bugungi kurs bilan so'mda
    const walletRows = wallets.map((w) => {
      const sums = monthSums.get(w._id);
      const currency = currencyOf(w);
      const balance = balanceOf(w.initialBalance, allSums.get(w._id));
      return {
        id: String(w._id),
        name: w.name,
        kind: w.kind,
        currency,
        icon: w.icon,
        color: w.color,
        archived: w.archived,
        initialBalance: w.initialBalance,
        balance,
        balanceUzs: minorToUzs(balance, currency, rates[currency]),
        rate: currency === "UZS" ? null : rates[currency] || null,
        monthIn: sums.kirim + sums.transferIn,
        monthOut: sums.chiqim + sums.transferOut,
      };
    });
    const total = walletRows.reduce((sum, w) => sum + w.balanceUzs, 0);

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

    // Hozirgi jamidan orqaga: oy boshidagi qoldiq = oy oxiridagi − oy natijasi. Chet valyutadagi pul bugungi
    // kurs bilan hisoblanadi, shuning uchun oxirgi nuqta haqiqiy jami bilan doim teng
    const history: { month: string; label: string; start: number; income: number; expense: number; end: number; change: number | null }[] = [];
    let running = total;
    for (let m = current; m >= firstShown; m = shiftMonth(m, -1)) {
      const f = flows.get(m) ?? { income: 0, expense: 0 };
      const end = running;
      const start = end - (f.income - f.expense);
      history.unshift({
        month: m,
        label: monthLabel(m),
        start,
        income: f.income,
        expense: f.expense,
        end,
        change: growthPercent(start, end),
      });
      running = start;
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
      /** Hamyonlarda ishlatilgan chet valyutalar kurslari */
      rates: ratesSnapshot.info,
      missingRates: ratesSnapshot.missing.filter((c) => walletRows.some((w) => w.currency === c && !w.archived)),
    };
  });
}
