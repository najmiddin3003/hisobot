import "server-only";
import {
  calcDebt,
  paymentCategoryKey,
  paymentTxType,
  principalCategoryKey,
  principalTxType,
} from "@/lib/debts";
import { paidByPayments, syncDebtStatus } from "@/lib/debts-sync";
import type { DebtDirection, DebtKind, Source, SystemCategoryKey } from "@/lib/domain";
import { Category, Debt, Transaction, Wallet } from "@/lib/models";
import { formatMoney } from "@/lib/money";

// Qarz amallari — sayt (server action) va Telegram bot uchun umumiy. Kiritilgan ma'lumot oldindan tekshirilgan bo'lishi kerak.

export type OpResult = { ok: true; debtId?: string } | { ok: false; error: string };

const SETUP_HINT = "Tizim kategoriyasi topilmadi — terminalda npm run setup ni ishga tushiring";

async function systemCategoryId(key: SystemCategoryKey) {
  const category = await Category.findOne({ systemKey: key }, { _id: 1 }).lean();
  return category?._id ?? null;
}

/** Qarz va kreditlar so'mda yuritiladi — faqat so'mli hamyon (eski hamyonlarda valyuta yo'q = so'm) */
export async function isActiveWallet(walletId: string) {
  return Boolean(await Wallet.exists({ _id: walletId, archived: false, currency: { $in: ["UZS", null] } }));
}

const entryNote = (counterparty: string, text: string) => (text ? `${counterparty} — ${text}` : counterparty);

export type DebtFields = {
  counterparty: string;
  amount: number;
  startedAt: Date;
  dueDate: Date | null;
  monthlyPayment: number | null;
  paymentDay: number | null;
  termMonths: number | null;
  paidBefore: number;
  note: string;
};

/**
 * Qarzni yaratadi yoki yangilaydi. recordEntry bo'lsa qarzning o'zi kirim (olinganda)
 * yoki chiqim (berilganda) bo'lib yoziladi va keyingi tahrirlarda u bilan birga yangilanadi.
 * Turi va yo'nalishi yaratilgandan keyin o'zgarmaydi.
 */
export async function saveDebtRecord(input: {
  id?: string;
  direction: DebtDirection;
  kind: DebtKind;
  fields: DebtFields;
  recordEntry: boolean;
  walletId: string;
  source: Source;
}): Promise<OpResult> {
  const { id, fields, recordEntry, walletId, source } = input;
  if (recordEntry && !(await isActiveWallet(walletId))) return { ok: false, error: "Hamyonni tanlang" };

  const debt = id
    ? await Debt.findOne({ _id: id, deletedAt: null })
    : new Debt({ ...fields, direction: input.direction, kind: input.kind, source });
  if (!debt) return { ok: false, error: "Qarz topilmadi" };
  if (id) debt.set(fields);
  await debt.save();

  const principal = await Transaction.findOne({ debtId: debt._id, debtRole: "asosiy" });
  if (recordEntry) {
    const categoryId = await systemCategoryId(principalCategoryKey(debt.direction, debt.kind));
    if (!categoryId) return { ok: false, error: SETUP_HINT };
    const entry = {
      type: principalTxType(debt.direction),
      amount: debt.amount,
      categoryId,
      walletId,
      occurredAt: debt.startedAt,
      note: entryNote(debt.counterparty, debt.note),
      deletedAt: null,
    };
    if (principal) {
      principal.set(entry);
      await principal.save();
    } else {
      await Transaction.create({ ...entry, debtId: debt._id, debtRole: "asosiy", source });
    }
  } else if (principal) {
    await principal.deleteOne();
  }

  await syncDebtStatus(debt._id);
  return { ok: true, debtId: String(debt._id) };
}

/** Qarzni (qisman) qaytarish: to'lov kirim yoki chiqim bo'lib yoziladi, qoldiqdan ko'p bo'lishi mumkin emas */
export async function addPaymentRecord(input: {
  debtId: string;
  amount: number;
  walletId: string;
  occurredAt: Date;
  note: string;
  source: Source;
}): Promise<OpResult> {
  const debt = await Debt.findOne({ _id: input.debtId, deletedAt: null });
  if (!debt) return { ok: false, error: "Qarz topilmadi" };
  if (debt.status === "yopilgan") return { ok: false, error: "Bu qarz yopilgan" };
  if (!(await isActiveWallet(input.walletId))) return { ok: false, error: "Hamyonni tanlang" };

  const { remaining } = calcDebt(debt, await paidByPayments(debt._id));
  if (input.amount > remaining) {
    return { ok: false, error: `Qolgan summa ${formatMoney(remaining)} — undan ko'p kiritib bo'lmaydi` };
  }

  const categoryId = await systemCategoryId(paymentCategoryKey(debt.direction, debt.kind));
  if (!categoryId) return { ok: false, error: SETUP_HINT };

  await Transaction.create({
    type: paymentTxType(debt.direction),
    amount: input.amount,
    categoryId,
    walletId: input.walletId,
    occurredAt: input.occurredAt,
    note: entryNote(debt.counterparty, input.note),
    debtId: debt._id,
    debtRole: "tolov",
    source: input.source,
  });
  await syncDebtStatus(debt._id);
  return { ok: true, debtId: String(debt._id) };
}
