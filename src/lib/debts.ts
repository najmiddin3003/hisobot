// Qarz, xaq va kredit hisob-kitoblari (bazaga murojaat qilmaydi)
import { currentMonthKey, dayKey, dayOfMonthIn, daysUntil, shiftMonth } from "@/lib/dates";
import type { DebtDirection, DebtKind, SystemCategoryKey, TxType } from "@/lib/domain";

type DebtShape = {
  kind: DebtKind;
  amount: number;
  startedAt: Date;
  dueDate?: Date | null;
  monthlyPayment?: number | null;
  paymentDay?: number | null;
  termMonths?: number | null;
  paidBefore?: number | null;
};

/**
 * Qancha to'langani, qancha qolgani va keyingi to'lov sanasi.
 * Kreditda qaytariladigan jami = oylik to'lov × muddat (bank jadvalidagi summa), aks holda olingan summa.
 * Kreditning k-to'lovi kredit olingan oydan k oy keyin, to'lov kunida.
 */
export function calcDebt(debt: DebtShape, paidByPayments: number, now = new Date()) {
  const isCredit = debt.kind === "kredit";
  const monthly = debt.monthlyPayment ?? 0;
  const total = isCredit && monthly > 0 && debt.termMonths ? monthly * debt.termMonths : debt.amount;
  const paid = (debt.paidBefore ?? 0) + paidByPayments;
  const remaining = Math.max(total - paid, 0);

  let nextDue: Date | null = null;
  let monthsPaid: number | null = null;
  let remainingMonths: number | null = null;

  if (isCredit && monthly > 0) {
    monthsPaid = Math.floor(paid / monthly);
    remainingMonths = debt.termMonths ? Math.max(debt.termMonths - monthsPaid, 0) : null;
    if (remaining > 0 && debt.paymentDay) {
      const startMonth = currentMonthKey(debt.startedAt);
      nextDue = dayOfMonthIn(shiftMonth(startMonth, monthsPaid + 1), debt.paymentDay);
    }
  } else if (remaining > 0 && debt.dueDate) {
    nextDue = debt.dueDate;
  }

  const daysToDue = nextDue ? daysUntil(nextDue, now) : null;
  return {
    total,
    paid,
    remaining,
    progress: total > 0 ? Math.min(paid / total, 1) : 1,
    nextDue,
    daysToDue,
    overdue: nextDue !== null && dayKey(nextDue) < dayKey(now),
    monthsPaid,
    remainingMonths,
  };
}

/** Qarz olinganda/berilganda yoziladigan kirim yoki chiqim kategoriyasi */
export function principalCategoryKey(direction: DebtDirection, kind: DebtKind): SystemCategoryKey {
  if (direction === "berilgan") return "qarz_berildi";
  return kind === "kredit" ? "kredit_olindi" : "qarz_olindi";
}

/** Qarz qaytarilganda yoziladigan kirim yoki chiqim kategoriyasi */
export function paymentCategoryKey(direction: DebtDirection, kind: DebtKind): SystemCategoryKey {
  if (direction === "berilgan") return "qarz_qaytarildi";
  return kind === "kredit" ? "kredit_tolovi" : "qarz_qaytardim";
}

/** Qarz olish → kirim, berish → chiqim; qaytarish — aksincha */
export const principalTxType = (direction: DebtDirection): TxType => (direction === "olingan" ? "kirim" : "chiqim");
export const paymentTxType = (direction: DebtDirection): TxType => (direction === "olingan" ? "chiqim" : "kirim");

/** "bugun", "14 kun qoldi", "3 kun o'tdi" */
export function daysText(days: number) {
  if (days === 0) return "bugun";
  return days > 0 ? `${days} kun qoldi` : `${-days} kun o'tdi`;
}
