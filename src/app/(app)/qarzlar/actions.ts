"use server";

import { isValidObjectId } from "mongoose";
import { refresh } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/app/(app)/kirim-chiqim/actions";
import { requireActionSession } from "@/lib/auth/guard";
import { fromDateInput, fromDateTimeInput } from "@/lib/dates";
import { connectDB } from "@/lib/db";
import {
  calcDebt,
  paymentCategoryKey,
  paymentTxType,
  principalCategoryKey,
  principalTxType,
} from "@/lib/debts";
import { paidByPayments, syncDebtStatus } from "@/lib/debts-sync";
import { DEBT_DIRECTIONS, DEBT_KINDS, type SystemCategoryKey } from "@/lib/domain";
import { Category, Debt, Transaction, Wallet } from "@/lib/models";
import { formatMoney } from "@/lib/money";

const fail = (error: string): ActionResult => ({ ok: false, error });
const firstIssue = (error: z.ZodError) => fail(error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri");

const objectId = z.string().refine((v) => isValidObjectId(v), "Noto'g'ri identifikator");
const money = (empty: string) =>
  z
    .number({ error: empty })
    .int("Summa butun son bo'lishi kerak")
    .min(1, empty)
    .max(1_000_000_000_000, "Summa juda katta");
const dateTime = z.string().transform((value, ctx) => {
  const date = fromDateTimeInput(value);
  if (!date) {
    ctx.addIssue({ code: "custom", message: "Sana va vaqtni to'g'ri kiriting" });
    return z.NEVER;
  }
  if (date.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
    ctx.addIssue({ code: "custom", message: "Kelajakdagi sanani tanlab bo'lmaydi" });
    return z.NEVER;
  }
  return date;
});
const optionalDate = z
  .string()
  .optional()
  .transform((value, ctx) => {
    if (!value) return null;
    const date = fromDateInput(value);
    if (!date) {
      ctx.addIssue({ code: "custom", message: "Qaytarish muddatini to'g'ri kiriting" });
      return z.NEVER;
    }
    return date;
  });
const note = z.string().trim().max(500, "Izoh 500 belgidan oshmasin").default("");

async function systemCategoryId(key: SystemCategoryKey) {
  const category = await Category.findOne({ systemKey: key }, { _id: 1 }).lean();
  return category?._id ?? null;
}

async function activeWallet(walletId: string) {
  return Wallet.exists({ _id: walletId, archived: false });
}

const entryNote = (counterparty: string, text: string) => (text ? `${counterparty} — ${text}` : counterparty);

// ---- Qarz / xaq / kredit yaratish va tahrirlash ----

const debtSchema = z
  .object({
    id: objectId.optional(),
    direction: z.enum(DEBT_DIRECTIONS),
    kind: z.enum(DEBT_KINDS),
    counterparty: z.string().trim().min(1, "Ism yoki bank nomini kiriting").max(120, "Nomi juda uzun"),
    amount: money("Summani kiriting"),
    startedAt: dateTime,
    dueDate: optionalDate,
    monthlyPayment: z.number().int().min(1).max(1_000_000_000_000).nullable().default(null),
    paymentDay: z.number().int().min(1).max(31).nullable().default(null),
    termMonths: z.number().int().min(1).max(600).nullable().default(null),
    paidBefore: z.number().int().min(0).max(1_000_000_000_000).default(0),
    recordEntry: z.boolean(),
    walletId: z.string().default(""),
    note,
  })
  .superRefine((v, ctx) => {
    if (v.kind === "kredit") {
      if (v.direction !== "olingan") ctx.addIssue({ code: "custom", message: "Kredit faqat olinadi" });
      if (!v.monthlyPayment) ctx.addIssue({ code: "custom", message: "Oylik to'lovni kiriting" });
      if (!v.paymentDay) ctx.addIssue({ code: "custom", message: "To'lov kunini tanlang" });
      if (!v.termMonths) ctx.addIssue({ code: "custom", message: "Kredit muddatini (oy) kiriting" });
    }
    if (v.recordEntry && !isValidObjectId(v.walletId)) ctx.addIssue({ code: "custom", message: "Hamyonni tanlang" });
  });

export async function saveDebt(input: unknown): Promise<ActionResult> {
  await requireActionSession();
  const parsed = debtSchema.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  const { id, recordEntry, walletId, ...data } = parsed.data;
  const isCredit = data.kind === "kredit";

  await connectDB();
  if (recordEntry && !(await activeWallet(walletId))) return fail("Hamyonni tanlang");

  const fields = {
    counterparty: data.counterparty,
    amount: data.amount,
    startedAt: data.startedAt,
    dueDate: isCredit ? null : data.dueDate,
    monthlyPayment: isCredit ? data.monthlyPayment : null,
    paymentDay: isCredit ? data.paymentDay : null,
    termMonths: isCredit ? data.termMonths : null,
    paidBefore: data.paidBefore,
    note: data.note,
  };

  // Turi va yo'nalishi yaratilgandan keyin o'zgarmaydi
  const debt = id
    ? await Debt.findOne({ _id: id, deletedAt: null })
    : new Debt({ ...fields, direction: data.direction, kind: data.kind, source: "web" });
  if (!debt) return fail("Qarz topilmadi");
  if (id) debt.set(fields);
  await debt.save();

  // Qarzning o'zi kirim (olinganda) yoki chiqim (berilganda) sifatida yoziladi
  const principal = await Transaction.findOne({ debtId: debt._id, debtRole: "asosiy" });
  if (recordEntry) {
    const categoryId = await systemCategoryId(principalCategoryKey(debt.direction, debt.kind));
    if (!categoryId) return fail("Tizim kategoriyasi topilmadi — terminalda npm run setup ni ishga tushiring");
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
      await Transaction.create({ ...entry, debtId: debt._id, debtRole: "asosiy", source: "web" });
    }
  } else if (principal) {
    await principal.deleteOne();
  }

  await syncDebtStatus(debt._id);
  refresh();
  return { ok: true };
}

// ---- To'lovlar ----

const paymentSchema = z.object({
  debtId: objectId,
  amount: money("To'lov summasini kiriting"),
  walletId: objectId,
  occurredAt: dateTime,
  note,
});

export async function addDebtPayment(input: unknown): Promise<ActionResult> {
  await requireActionSession();
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  const { debtId, walletId, ...data } = parsed.data;

  await connectDB();
  const debt = await Debt.findOne({ _id: debtId, deletedAt: null });
  if (!debt) return fail("Qarz topilmadi");
  if (debt.status === "yopilgan") return fail("Bu qarz yopilgan");
  if (!(await activeWallet(walletId))) return fail("Hamyonni tanlang");

  const { remaining } = calcDebt(debt, await paidByPayments(debt._id));
  if (data.amount > remaining) return fail(`Qolgan summa ${formatMoney(remaining)} — undan ko'p kiritib bo'lmaydi`);

  const categoryId = await systemCategoryId(paymentCategoryKey(debt.direction, debt.kind));
  if (!categoryId) return fail("Tizim kategoriyasi topilmadi — terminalda npm run setup ni ishga tushiring");

  await Transaction.create({
    type: paymentTxType(debt.direction),
    amount: data.amount,
    categoryId,
    walletId,
    occurredAt: data.occurredAt,
    note: entryNote(debt.counterparty, data.note),
    debtId: debt._id,
    debtRole: "tolov",
    source: "web",
  });
  await syncDebtStatus(debt._id);
  refresh();
  return { ok: true };
}

/** To'lovni o'chirish — kirim-chiqimdan ham yo'qoladi, qarz qoldig'i qayta hisoblanadi */
export async function deleteDebtPayment(input: unknown): Promise<ActionResult> {
  await requireActionSession();
  const parsed = z.object({ id: objectId }).safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);

  await connectDB();
  const payment = await Transaction.findOne({ _id: parsed.data.id, debtRole: "tolov" });
  if (!payment?.debtId) return fail("To'lov topilmadi");
  await payment.deleteOne();
  await syncDebtStatus(payment.debtId);
  refresh();
  return { ok: true };
}

// ---- Yopish, qayta ochish, o'chirish ----

export async function setDebtClosed(input: unknown): Promise<ActionResult> {
  await requireActionSession();
  const parsed = z.object({ id: objectId, closed: z.boolean() }).safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);

  await connectDB();
  const debt = await Debt.findOne({ _id: parsed.data.id, deletedAt: null });
  if (!debt) return fail("Qarz topilmadi");
  if (parsed.data.closed) debt.set({ status: "yopilgan", closeReason: "qolda", closedAt: new Date() });
  else debt.set({ status: "ochiq", closeReason: null, closedAt: null });
  await debt.save();
  // Qayta ochilganda qoldiq 0 bo'lsa — yana avtomatik yopiladi
  if (!parsed.data.closed) await syncDebtStatus(debt._id);
  refresh();
  return { ok: true };
}

/** Qarzni va unga bog'liq barcha kirim-chiqim yozuvlarini o'chiradi */
export async function deleteDebt(input: unknown): Promise<ActionResult> {
  await requireActionSession();
  const parsed = z.object({ id: objectId }).safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);

  await connectDB();
  const now = new Date();
  const debt = await Debt.findOneAndUpdate({ _id: parsed.data.id, deletedAt: null }, { deletedAt: now });
  if (!debt) return fail("Qarz topilmadi");
  await Transaction.updateMany({ debtId: debt._id, deletedAt: null }, { deletedAt: now });
  refresh();
  return { ok: true };
}
