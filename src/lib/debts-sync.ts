import "server-only";
import type { Types } from "mongoose";
import { calcDebt } from "@/lib/debts";
import { Debt, Transaction } from "@/lib/models";

/** Qarz bo'yicha qilingan to'lovlar yig'indisi (o'chirilganlarsiz) */
export async function paidByPayments(debtId: Types.ObjectId | string) {
  const payments = await Transaction.find({ debtId, debtRole: "tolov", deletedAt: null }, { amount: 1 }).lean();
  return payments.reduce((sum, p) => sum + p.amount, 0);
}

/**
 * To'lovlar o'zgargach holatni yangilaydi: to'liq qaytarilsa — avtomatik yopiladi,
 * to'lov o'chirilib qoldiq paydo bo'lsa — qayta ochiladi (qo'lda yopilganlarga tegilmaydi).
 */
export async function syncDebtStatus(debtId: Types.ObjectId | string) {
  const debt = await Debt.findById(debtId);
  if (!debt) return;
  const { remaining } = calcDebt(debt, await paidByPayments(debt._id));

  if (remaining === 0 && debt.status === "ochiq") {
    debt.set({ status: "yopilgan", closeReason: "tolandi", closedAt: new Date() });
  } else if (remaining > 0 && debt.status === "yopilgan" && debt.closeReason === "tolandi") {
    debt.set({ status: "ochiq", closeReason: null, closedAt: null });
  } else {
    return;
  }
  await debt.save();
}
