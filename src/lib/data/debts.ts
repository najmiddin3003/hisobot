import "server-only";
import { requireUser } from "@/lib/auth/dal";
import { loadEntryOptions } from "@/lib/data/entries";
import { connectDB } from "@/lib/db";
import { calcDebt } from "@/lib/debts";
import type { DebtDirection } from "@/lib/domain";
import { Debt, Transaction, Wallet } from "@/lib/models";

export type DebtsPage = Awaited<ReturnType<typeof getDebtsPage>>;
export type DebtItem = DebtsPage["items"][number];

/** Qarzlar (direction: olingan) yoki Xaq (berilgan) sahifasi uchun ro'yxat va hisob-kitoblar */
export async function getDebtsPage(direction: DebtDirection) {
  await requireUser();
  await connectDB();

  const [debts, wallets, options] = await Promise.all([
    Debt.find({ direction, deletedAt: null }).sort({ startedAt: -1 }).lean(),
    Wallet.find({}, { name: 1 }).lean(),
    loadEntryOptions(),
  ]);
  const transactions = await Transaction.find({ debtId: { $in: debts.map((d) => d._id) }, deletedAt: null })
    .sort({ occurredAt: -1 })
    .lean();

  const walletName = (id: unknown) => wallets.find((w) => w._id.equals(String(id)))?.name ?? "O'chirilgan hamyon";
  const now = new Date();

  const items = debts.map((debt) => {
    const linked = transactions.filter((t) => t.debtId?.equals(debt._id));
    const payments = linked.filter((t) => t.debtRole === "tolov");
    const principal = linked.find((t) => t.debtRole === "asosiy");
    const calc = calcDebt(
      debt,
      payments.reduce((sum, p) => sum + p.amount, 0),
      now,
    );
    const closed = debt.status === "yopilgan";

    return {
      id: String(debt._id),
      direction: debt.direction,
      kind: debt.kind,
      counterparty: debt.counterparty,
      amount: debt.amount,
      startedAt: debt.startedAt.toISOString(),
      dueDate: debt.dueDate?.toISOString() ?? null,
      monthlyPayment: debt.monthlyPayment ?? null,
      paymentDay: debt.paymentDay ?? null,
      termMonths: debt.termMonths ?? null,
      paidBefore: debt.paidBefore ?? 0,
      note: debt.note,
      source: debt.source,
      closed,
      closeReason: debt.closeReason ?? null,
      closedAt: debt.closedAt?.toISOString() ?? null,
      total: calc.total,
      paid: calc.paid,
      remaining: calc.remaining,
      progress: calc.progress,
      nextDue: closed ? null : (calc.nextDue?.toISOString() ?? null),
      daysToDue: closed ? null : calc.daysToDue,
      overdue: !closed && calc.overdue,
      monthsPaid: calc.monthsPaid,
      remainingMonths: calc.remainingMonths,
      principal: principal
        ? {
            id: String(principal._id),
            walletId: String(principal.walletId),
            walletName: walletName(principal.walletId),
            occurredAt: principal.occurredAt.toISOString(),
          }
        : null,
      payments: payments.map((p) => ({
        id: String(p._id),
        amount: p.amount,
        walletName: walletName(p.walletId),
        occurredAt: p.occurredAt.toISOString(),
        createdAt: p.createdAt.toISOString(),
        note: p.note,
        source: p.source,
      })),
    };
  });

  // Ochiqlar: muddati o'tganlar birinchi, keyin eng yaqin muddat; yopilganlar — oxirgi yopilgani birinchi
  const open = items
    .filter((i) => !i.closed)
    .sort((a, b) => Number(b.overdue) - Number(a.overdue) || (a.daysToDue ?? 1e9) - (b.daysToDue ?? 1e9));
  const closed = items.filter((i) => i.closed).sort((a, b) => (b.closedAt ?? "").localeCompare(a.closedAt ?? ""));

  // Qarz va kreditlar so'mda yuritiladi — faqat so'mli hamyonlar
  return { items: [...open, ...closed], wallets: options.wallets.filter((w) => w.currency === "UZS") };
}

const UPCOMING_DAYS = 30;

/**
 * Dashboard uchun: ochiq qarz/xaq qoldiqlari va yaqin 30 kundagi (yoki muddati o'tgan) to'lovlar.
 * Seans chaqiruvchi tomonda tekshirilgan bo'lishi kerak.
 */
export async function loadDebtOverview(now = new Date()) {
  const debts = await Debt.find({ deletedAt: null, status: "ochiq" }).lean();
  const payments = await Transaction.aggregate<{ _id: unknown; total: number }>([
    { $match: { debtId: { $in: debts.map((d) => d._id) }, debtRole: "tolov", deletedAt: null } },
    { $group: { _id: "$debtId", total: { $sum: "$amount" } } },
  ]);

  let owe = 0;
  let owed = 0;
  const upcoming = [];
  for (const debt of debts) {
    const paid = payments.find((p) => debt._id.equals(String(p._id)))?.total ?? 0;
    const calc = calcDebt(debt, paid, now);
    if (calc.remaining === 0) continue;
    if (debt.direction === "olingan") owe += calc.remaining;
    else owed += calc.remaining;

    if (calc.nextDue && calc.daysToDue !== null && calc.daysToDue <= UPCOMING_DAYS) {
      upcoming.push({
        id: String(debt._id),
        counterparty: debt.counterparty,
        direction: debt.direction,
        kind: debt.kind,
        // Kreditda — navbatdagi oylik to'lov, oddiy qarzda — qolgan summa
        amount: debt.kind === "kredit" ? Math.min(debt.monthlyPayment ?? calc.remaining, calc.remaining) : calc.remaining,
        nextDue: calc.nextDue.toISOString(),
        daysToDue: calc.daysToDue,
        overdue: calc.overdue,
      });
    }
  }
  upcoming.sort((a, b) => a.daysToDue - b.daysToDue);
  return { owe, owed, overdueCount: upcoming.filter((u) => u.overdue).length, upcoming };
}
