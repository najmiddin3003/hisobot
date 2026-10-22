import "server-only";
import { balanceOf, sumsByWallet } from "@/lib/balances";
import { MONTH_NAMES, currentMonthKey, formatDate, monthLabel, monthRange, tashkentDate, tashkentToday } from "@/lib/dates";
import { Category, Transaction, Wallet } from "@/lib/models";
import { formatMoney } from "@/lib/money";
import { generateDueRecurring } from "@/lib/recurring";
import { esc } from "./parse";

export type ReportPeriod = "bugun" | "hafta" | "oy";

function periodRange(period: ReportPeriod, now: Date) {
  const { year, month, day } = tashkentToday(now);
  if (period === "oy") return { start: monthRange(currentMonthKey(now)).start, title: `Bu oy · ${monthLabel(currentMonthKey(now))}` };
  if (period === "bugun") return { start: tashkentDate(year, month, day), title: `Bugun · ${formatDate(now)}` };
  // Hafta dushanbadan boshlanadi
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const start = tashkentDate(year, month, day - ((weekday + 6) % 7));
  return { start, title: `Bu hafta · ${formatDate(start).replace(/ \d{4}$/, "")} – ${day} ${MONTH_NAMES[month - 1].toLowerCase()}` };
}

/** Botdagi "📊 Hisobot": kirim, chiqim, eng katta kategoriyalar va hamyonlar qoldig'i */
export async function buildReport(period: ReportPeriod, now = new Date()) {
  await generateDueRecurring(now);
  const { start, title } = periodRange(period, now);
  const match = { deletedAt: null, occurredAt: { $gte: start, $lte: now } };

  const [totals, topCategories, categories, wallets, sums] = await Promise.all([
    Transaction.aggregate<{ _id: "kirim" | "chiqim"; total: number; count: number }>([
      { $match: match },
      { $group: { _id: "$type", total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]),
    Transaction.aggregate<{ _id: unknown; total: number }>([
      { $match: { ...match, type: "chiqim" } },
      { $group: { _id: "$categoryId", total: { $sum: "$amount" } } },
      { $sort: { total: -1 } },
      { $limit: 3 },
    ]),
    Category.find({}, { name: 1 }).lean(),
    Wallet.find({ archived: false }).sort({ order: 1 }).lean(),
    sumsByWallet(),
  ]);

  const income = totals.find((t) => t._id === "kirim")?.total ?? 0;
  const expense = totals.find((t) => t._id === "chiqim")?.total ?? 0;
  const count = totals.reduce((sum, t) => sum + t.count, 0);
  const balances = wallets.map((w) => ({ name: w.name, balance: balanceOf(w.initialBalance, sums.get(w._id)) }));
  const total = balances.reduce((sum, w) => sum + w.balance, 0);

  const lines = [
    `📊 <b>${esc(title)}</b>`,
    "",
    `➕ Kirim: <b>${formatMoney(income)}</b>`,
    `➖ Chiqim: <b>${formatMoney(expense)}</b>`,
    `🟰 Natija: <b>${formatMoney(income - expense, { sign: true })}</b>`,
    `🧾 Yozuvlar: ${count} ta`,
  ];
  if (topCategories.length > 0) {
    lines.push("", "<b>Eng ko'p chiqim:</b>");
    for (const row of topCategories) {
      const name = categories.find((c) => c._id.equals(String(row._id)))?.name ?? "—";
      lines.push(`• ${esc(name)} — ${formatMoney(row.total)}`);
    }
  }
  lines.push("", "<b>Hamyonlar:</b>");
  for (const w of balances) lines.push(`• ${esc(w.name)} — ${formatMoney(w.balance)}`);
  lines.push(`💰 Jami: <b>${formatMoney(total)}</b>`);
  return lines.join("\n");
}
