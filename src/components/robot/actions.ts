"use server";

import { requireActionSession } from "@/lib/auth/guard";
import { loadDebtOverview } from "@/lib/data/debts";
import { connectDB } from "@/lib/db";
import { currentMonthKey, dayKey, fromDateInput, monthRange } from "@/lib/dates";
import { Goal, Transaction } from "@/lib/models";
import { formatCompact } from "@/lib/money";

/** Oydin aytadigan, ma'lumotlarga asoslangan qisqa gaplar (oy natijasi, bugungi chiqim, maqsad, qarz) */
export async function getRobotTips(): Promise<string[]> {
  await requireActionSession();
  await connectDB();

  const now = new Date();
  const { start, end } = monthRange(currentMonthKey(now));
  const today = fromDateInput(dayKey(now)) ?? start;

  const [month, todayRows, goals, debts] = await Promise.all([
    Transaction.aggregate<{ _id: "kirim" | "chiqim"; total: number }>([
      { $match: { deletedAt: null, occurredAt: { $gte: start, $lt: end } } },
      { $group: { _id: "$type", total: { $sum: "$amount" } } },
    ]),
    Transaction.aggregate<{ _id: null; total: number }>([
      { $match: { deletedAt: null, type: "chiqim", occurredAt: { $gte: today } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Goal.find({}, { name: 1, targetAmount: 1, savedAmount: 1 }).lean(),
    loadDebtOverview(now),
  ]);

  const tips: string[] = [];

  const income = month.find((r) => r._id === "kirim")?.total ?? 0;
  const expense = month.find((r) => r._id === "chiqim")?.total ?? 0;
  if (income > 0 && expense < income) {
    tips.push(`Bu oy kirimning ${Math.round(((income - expense) / income) * 100)}% qismi tejaldi. Zo'r! 🎉`);
  } else if (income > 0) {
    tips.push("Bu oy chiqim kirimdan oshib ketdi. Biroz ehtiyot bo'laylikmi? 🤏");
  }

  const spentToday = todayRows[0]?.total ?? 0;
  tips.push(
    spentToday > 0 ? `Bugun ${formatCompact(spentToday)} so'm sarfladingiz.` : "Bugun hali hech narsa sarflamadingiz. Barakalla! ✨",
  );

  const open = goals.filter((g) => g.savedAmount < g.targetAmount).sort((a, b) => b.savedAmount / b.targetAmount - a.savedAmount / a.targetAmount);
  if (open[0]) {
    const g = open[0];
    tips.push(`«${g.name}» maqsadiga ${Math.round((g.savedAmount / g.targetAmount) * 100)}% yig'ildi, yana ${formatCompact(g.targetAmount - g.savedAmount)} qoldi.`);
  }
  const done = goals.find((g) => g.savedAmount >= g.targetAmount);
  if (done) tips.push(`«${done.name}» maqsadi bajarilgan! Tabriklayman 🥳`);

  const next = debts.upcoming[0];
  if (next?.overdue) tips.push(`${next.counterparty} bilan to'lov muddati o'tib ketgan. Unutmang! ⏰`);
  else if (next && next.daysToDue <= 3) {
    tips.push(next.daysToDue === 0 ? `Bugun ${next.counterparty} bilan to'lov kuni.` : `${next.daysToDue} kundan keyin ${next.counterparty} bilan to'lov bor.`);
  }

  return tips;
}
