"use server";

import { isValidObjectId } from "mongoose";
import { refresh } from "next/cache";
import { z } from "zod";
import { requireActionSession } from "@/lib/auth/guard";
import { fromDateTimeInput } from "@/lib/dates";
import { connectDB } from "@/lib/db";
import { TX_TYPES } from "@/lib/domain";
import { Category, Recurring, Transaction, Transfer, Wallet } from "@/lib/models";
import { initialLastGeneratedMonth } from "@/lib/recurring";

export type ActionResult = { ok: true } | { ok: false; error: string };

const fail = (error: string): ActionResult => ({ ok: false, error });
const firstIssue = (error: z.ZodError) => fail(error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri");

const DEBT_LOCKED = "Bu yozuv qarzga bog'langan — uni Qarzlar bo'limidan o'zgartiring";

const objectId = z.string().refine((v) => isValidObjectId(v), "Noto'g'ri identifikator");
const amount = z
  .number({ error: "Summani kiriting" })
  .int("Summa butun son bo'lishi kerak")
  .min(1, "Summani kiriting")
  .max(1_000_000_000_000, "Summa juda katta");
const note = z.string().trim().max(500, "Izoh 500 belgidan oshmasin").default("");
const occurredAt = z.string().transform((value, ctx) => {
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
const entryKind = z.enum(["tx", "transfer"]);

/** Kategoriya qo'lda tanlanadigan va yozuv turiga mos bo'lishi kerak (qarz kategoriyalari emas) */
async function checkCategoryAndWallet(type: "kirim" | "chiqim", categoryId: string, walletId: string) {
  const [category, wallet] = await Promise.all([
    Category.findById(categoryId).lean(),
    Wallet.findById(walletId).lean(),
  ]);
  if (!category || category.archived || category.type !== type || (category.systemKey && category.systemKey !== "oylik")) {
    return "Kategoriyani tanlang";
  }
  if (!wallet || wallet.archived) return "Hamyonni tanlang";
  return null;
}

// ---- Kirim / chiqim ----

const transactionSchema = z.object({
  id: objectId.optional(),
  type: z.enum(TX_TYPES),
  amount,
  categoryId: objectId,
  walletId: objectId,
  occurredAt,
  note,
});

export async function saveTransaction(input: unknown): Promise<ActionResult> {
  await requireActionSession();
  const parsed = transactionSchema.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  const { id, ...data } = parsed.data;

  await connectDB();
  const problem = await checkCategoryAndWallet(data.type, data.categoryId, data.walletId);
  if (problem) return fail(problem);

  if (id) {
    const existing = await Transaction.findOne({ _id: id, deletedAt: null });
    if (!existing) return fail("Yozuv topilmadi — ehtimol o'chirilgan");
    if (existing.debtId) return fail(DEBT_LOCKED);
    existing.set(data);
    await existing.save();
  } else {
    await Transaction.create({ ...data, source: "web" });
  }
  refresh();
  return { ok: true };
}

// ---- Hamyonlar o'rtasida o'tkazma ----

const transferSchema = z
  .object({
    id: objectId.optional(),
    fromWalletId: objectId,
    toWalletId: objectId,
    amount,
    occurredAt,
    note,
  })
  .refine((v) => v.fromWalletId !== v.toWalletId, { message: "Ikki xil hamyonni tanlang" });

export async function saveTransfer(input: unknown): Promise<ActionResult> {
  await requireActionSession();
  const parsed = transferSchema.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  const { id, ...data } = parsed.data;

  await connectDB();
  const wallets = await Wallet.find({ _id: { $in: [data.fromWalletId, data.toWalletId] }, archived: false }).lean();
  if (wallets.length !== 2) return fail("Hamyonlarni tanlang");

  if (id) {
    const updated = await Transfer.updateOne({ _id: id, deletedAt: null }, data);
    if (updated.matchedCount === 0) return fail("O'tkazma topilmadi — ehtimol o'chirilgan");
  } else {
    await Transfer.create({ ...data, source: "web" });
  }
  refresh();
  return { ok: true };
}

// ---- O'chirish, tiklash, savatcha ----

const entryRef = z.object({ kind: entryKind, id: objectId });

/** Savatchaga o'tkazadi (bazadan o'chmaydi) */
export async function deleteEntry(input: unknown): Promise<ActionResult> {
  await requireActionSession();
  const parsed = entryRef.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  const { kind, id } = parsed.data;

  await connectDB();
  if (kind === "tx") {
    const existing = await Transaction.findOne({ _id: id, deletedAt: null }).lean();
    if (!existing) return fail("Yozuv topilmadi");
    if (existing.debtId) return fail(DEBT_LOCKED);
    await Transaction.updateOne({ _id: id }, { deletedAt: new Date() });
  } else {
    await Transfer.updateOne({ _id: id, deletedAt: null }, { deletedAt: new Date() });
  }
  refresh();
  return { ok: true };
}

export async function restoreEntry(input: unknown): Promise<ActionResult> {
  await requireActionSession();
  const parsed = entryRef.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  const { kind, id } = parsed.data;

  await connectDB();
  if (kind === "tx") await Transaction.updateOne({ _id: id }, { deletedAt: null });
  else await Transfer.updateOne({ _id: id }, { deletedAt: null });
  refresh();
  return { ok: true };
}

/** Savatchadan butunlay o'chirish — qaytarib bo'lmaydi */
export async function purgeEntry(input: unknown): Promise<ActionResult> {
  await requireActionSession();
  const parsed = entryRef.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  const { kind, id } = parsed.data;

  await connectDB();
  const filter = { _id: id, deletedAt: { $ne: null } };
  if (kind === "tx") await Transaction.deleteOne({ ...filter, debtId: null });
  else await Transfer.deleteOne(filter);
  refresh();
  return { ok: true };
}

// ---- Takroriy to'lovlar ----

const recurringSchema = z.object({
  id: objectId.optional(),
  name: z.string().trim().min(1, "Nomini kiriting").max(80, "Nomi juda uzun"),
  type: z.enum(TX_TYPES),
  amount,
  categoryId: objectId,
  walletId: objectId,
  dayOfMonth: z.number().int().min(1, "Kunni tanlang").max(31, "Kunni tanlang"),
  note,
});

export async function saveRecurring(input: unknown): Promise<ActionResult> {
  await requireActionSession();
  const parsed = recurringSchema.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  const { id, ...data } = parsed.data;

  await connectDB();
  const problem = await checkCategoryAndWallet(data.type, data.categoryId, data.walletId);
  if (problem) return fail(problem);

  if (id) {
    const updated = await Recurring.updateOne({ _id: id }, data);
    if (updated.matchedCount === 0) return fail("Takroriy to'lov topilmadi");
  } else {
    await Recurring.create({ ...data, active: true, lastGeneratedMonth: initialLastGeneratedMonth(data.dayOfMonth) });
  }
  refresh();
  return { ok: true };
}

export async function setRecurringActive(input: unknown): Promise<ActionResult> {
  await requireActionSession();
  const parsed = z.object({ id: objectId, active: z.boolean() }).safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  const { id, active } = parsed.data;

  await connectDB();
  const item = await Recurring.findById(id);
  if (!item) return fail("Takroriy to'lov topilmadi");
  item.active = active;
  if (active) {
    // Qayta yoqilganda o'tkazib yuborilgan oylar orqaga qarab yozilmaydi,
    // shu oy uchun allaqachon yozilgan bo'lsa — qayta yozilmaydi
    const initial = initialLastGeneratedMonth(item.dayOfMonth);
    const last = item.lastGeneratedMonth;
    item.lastGeneratedMonth = last && last > initial ? last : initial;
  }
  await item.save();
  refresh();
  return { ok: true };
}

/** Shablonni o'chiradi; u avval yaratgan yozuvlar kirim-chiqimda qoladi */
export async function deleteRecurring(input: unknown): Promise<ActionResult> {
  await requireActionSession();
  const parsed = z.object({ id: objectId }).safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);

  await connectDB();
  await Recurring.deleteOne({ _id: parsed.data.id });
  refresh();
  return { ok: true };
}
