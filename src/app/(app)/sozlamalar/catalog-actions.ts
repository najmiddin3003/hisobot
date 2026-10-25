"use server";

import { isValidObjectId, type Types } from "mongoose";
import { refresh } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/app/(app)/kirim-chiqim/actions";
import { requireActionSession } from "@/lib/auth/guard";
import { balanceOf, sumsByWallet } from "@/lib/balances";
import { CURRENCIES } from "@/lib/currency";
import { connectDB } from "@/lib/db";
import { TX_TYPES, WALLET_KINDS, type TxType } from "@/lib/domain";
import { isIconName } from "@/lib/icons";
import { AiChat, AiInsight, Category, Recurring, Transaction, Transfer, Wallet } from "@/lib/models";

// Kategoriya va hamyonlarni boshqarish. Yozuvi bor narsa butunlay o'chirilmaydi — faqat yashiriladi
// (eski yozuvlarda nomi ko'rinib turadi, yangi yozuvlarda tanlanmaydi).

const fail = (error: string): ActionResult => ({ ok: false, error });
const firstIssue = (error: z.ZodError) => error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri";

const objectId = z.string().refine((v) => isValidObjectId(v), "Topilmadi");
const name = z.string().trim().min(1, "Nomini yozing").max(60, "Nomi juda uzun (60 belgigacha)");
const icon = z.string().refine(isIconName, "Ikonkani tanlang");
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Rangni tanlang");

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const sameName = (value: string) => new RegExp(`^${escapeRegex(value)}$`, "i");

/** Yashirilmagan ro'yxatda tartib raqamlarini 0, 1, 2... qilib qayta yozadi */
async function rewriteOrder(model: typeof Category | typeof Wallet, ids: Types.ObjectId[]) {
  await (model as typeof Category).bulkWrite(
    ids.map((_id, order) => ({ updateOne: { filter: { _id }, update: { $set: { order } } } })),
  );
}

// ---------------------------------------------------------------- Kategoriyalar

const KEYWORD_LIMIT = 40;

const categorySchema = z.object({
  id: objectId.optional(),
  name,
  type: z.enum(TX_TYPES),
  icon,
  color,
  keywords: z
    .array(z.string().trim().toLowerCase().max(30, "Kalit so'z juda uzun (30 belgigacha)"))
    .max(KEYWORD_LIMIT, `Kalit so'zlar ${KEYWORD_LIMIT} tadan oshmasin`)
    .transform((list) => [...new Set(list.filter(Boolean))]),
});

export async function saveCategory(input: unknown): Promise<ActionResult> {
  await requireActionSession();
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const data = parsed.data;
  await connectDB();

  const existing = data.id ? await Category.findById(data.id) : null;
  if (data.id && !existing) return fail("Kategoriya topilmadi");
  // Mavjud kategoriyaning turi o'zgarmaydi — eski yozuvlar kirimdan chiqimga o'tib ketmasin
  const type = existing?.type ?? data.type;

  const others = await Category.find({ type, archived: false, _id: { $ne: existing?._id } }, { name: 1, keywords: 1 }).lean();
  if (others.some((c) => sameName(data.name).test(c.name))) {
    return fail(`"${data.name}" nomli ${type} kategoriyasi allaqachon bor`);
  }
  // Botda bitta so'z ikki kategoriyaga mos kelmasin
  for (const keyword of data.keywords) {
    const owner = others.find((c) => c.keywords.includes(keyword));
    if (owner) return fail(`"${keyword}" kalit so'zi "${owner.name}" kategoriyasida bor`);
  }

  if (existing) {
    existing.set({ name: data.name, icon: data.icon, color: data.color, keywords: data.keywords });
    await existing.save();
  } else {
    const last = await Category.findOne({ type }).sort({ order: -1 }).lean();
    await Category.create({ ...data, type, order: (last?.order ?? -1) + 1 });
  }
  refresh();
  return { ok: true };
}

/** Shu turdagi qo'lda tanlanadigan kategoriyalar (tizimnikilarsiz, oylikdan tashqari) */
const selectableFilter = (type: TxType) => ({
  type,
  archived: false,
  $or: [{ systemKey: null }, { systemKey: "oylik" as const }],
});

export async function setCategoryArchived(input: unknown): Promise<ActionResult> {
  await requireActionSession();
  const parsed = z.object({ id: objectId, archived: z.boolean() }).safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  await connectDB();

  const category = await Category.findById(parsed.data.id);
  if (!category) return fail("Kategoriya topilmadi");

  if (parsed.data.archived) {
    if (category.systemKey) return fail("Tizim kategoriyasini yashirib bo'lmaydi — u qarz/oylik uchun kerak");
    if (await Recurring.exists({ categoryId: category._id, active: true })) {
      return fail("Bu kategoriya faol takroriy to'lovda ishlatilmoqda. Avval to'lovni o'zgartiring yoki to'xtating.");
    }
    const left = await Category.countDocuments({ ...selectableFilter(category.type), _id: { $ne: category._id } });
    if (left === 0) return fail(`Kamida bitta ${category.type} kategoriyasi qolishi kerak`);
  } else {
    const clash = await Category.exists({
      type: category.type,
      archived: false,
      name: sameName(category.name),
      _id: { $ne: category._id },
    });
    if (clash) return fail(`"${category.name}" nomli faol kategoriya bor — avval birining nomini o'zgartiring`);
    const last = await Category.findOne({ type: category.type }).sort({ order: -1 }).lean();
    category.order = (last?.order ?? -1) + 1;
  }

  category.archived = parsed.data.archived;
  await category.save();
  refresh();
  return { ok: true };
}

export async function deleteCategory(input: unknown): Promise<ActionResult> {
  await requireActionSession();
  const parsed = z.object({ id: objectId }).safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  await connectDB();

  const category = await Category.findById(parsed.data.id);
  if (!category) return fail("Kategoriya topilmadi");
  if (category.systemKey) return fail("Tizim kategoriyasini o'chirib bo'lmaydi");
  // Savatchadagi yozuvlar ham hisobga olinadi — ular qayta tiklanishi mumkin
  const [used, recurring] = await Promise.all([
    Transaction.exists({ categoryId: category._id }),
    Recurring.exists({ categoryId: category._id }),
  ]);
  if (used || recurring) return fail("Bu kategoriyada yozuvlar bor — uni faqat yashirish mumkin");
  if (!category.archived) {
    const left = await Category.countDocuments({ ...selectableFilter(category.type), _id: { $ne: category._id } });
    if (left === 0) return fail(`Kamida bitta ${category.type} kategoriyasi qolishi kerak`);
  }

  await category.deleteOne();
  refresh();
  return { ok: true };
}

const moveSchema = z.object({ id: objectId, direction: z.enum(["up", "down"]) });

export async function moveCategory(input: unknown): Promise<ActionResult> {
  await requireActionSession();
  const parsed = moveSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  await connectDB();

  const category = await Category.findById(parsed.data.id, { type: 1 }).lean();
  if (!category) return fail("Kategoriya topilmadi");
  const list = await Category.find({ type: category.type, archived: false }, { _id: 1 })
    .sort({ order: 1, createdAt: 1 })
    .lean();
  const ids = list.map((c) => c._id);
  if (!swap(ids, parsed.data.id, parsed.data.direction)) return { ok: true };
  await rewriteOrder(Category, ids);
  refresh();
  return { ok: true };
}

/** Ro'yxatda qo'shnisi bilan almashtiradi; joyi o'zgarmasa false */
function swap(ids: Types.ObjectId[], id: string, direction: "up" | "down") {
  const index = ids.findIndex((x) => x.equals(id));
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= ids.length) return false;
  [ids[index], ids[target]] = [ids[target], ids[index]];
  return true;
}

// ---------------------------------------------------------------- Hamyonlar

const walletSchema = z.object({
  id: objectId.optional(),
  name,
  kind: z.enum(WALLET_KINDS),
  /** Faqat yangi hamyonda tanlanadi — keyin o'zgarmaydi (eski yozuvlar shu valyutada) */
  currency: z.enum(CURRENCIES).default("UZS"),
  icon,
  color,
  /** Faqat yangi hamyonda: undagi hozirgi pul (tanlangan valyutaning eng kichik birligida) */
  initialBalance: z
    .number()
    .int("Summa butun son bo'lishi kerak")
    .min(-1_000_000_000_000)
    .max(1_000_000_000_000, "Summa juda katta")
    .optional(),
});

export async function saveWallet(input: unknown): Promise<ActionResult> {
  await requireActionSession();
  const parsed = walletSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const data = parsed.data;
  await connectDB();

  const existing = data.id ? await Wallet.findById(data.id) : null;
  if (data.id && !existing) return fail("Hamyon topilmadi");
  const clash = await Wallet.exists({ archived: false, name: sameName(data.name), _id: { $ne: existing?._id } });
  if (clash) return fail(`"${data.name}" nomli hamyon allaqachon bor`);

  if (existing) {
    existing.set({ name: data.name, kind: data.kind, icon: data.icon, color: data.color });
    await existing.save();
  } else {
    const last = await Wallet.findOne().sort({ order: -1 }).lean();
    await Wallet.create({
      name: data.name,
      kind: data.kind,
      currency: data.currency,
      icon: data.icon,
      color: data.color,
      initialBalance: data.initialBalance ?? 0,
      order: (last?.order ?? -1) + 1,
    });
  }
  refresh();
  return { ok: true };
}

export async function setWalletArchived(input: unknown): Promise<ActionResult> {
  await requireActionSession();
  const parsed = z.object({ id: objectId, archived: z.boolean() }).safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  await connectDB();

  const wallet = await Wallet.findById(parsed.data.id);
  if (!wallet) return fail("Hamyon topilmadi");

  if (parsed.data.archived) {
    // Yashirilgan hamyondagi pul jami budjetda qolaveradi, lekin ko'rinmay qoladi — shuning uchun avval 0 bo'lsin
    const balance = balanceOf(wallet.initialBalance, (await sumsByWallet()).get(wallet._id));
    if (balance !== 0) return fail("Hamyonda pul bor. Avval qoldiqni o'tkazma bilan boshqa hamyonga o'tkazing.");
    if (await Recurring.exists({ walletId: wallet._id, active: true })) {
      return fail("Bu hamyon faol takroriy to'lovda ishlatilmoqda. Avval to'lovni o'zgartiring yoki to'xtating.");
    }
    if ((await Wallet.countDocuments({ archived: false, _id: { $ne: wallet._id } })) === 0) {
      return fail("Kamida bitta hamyon qolishi kerak");
    }
  } else {
    const clash = await Wallet.exists({ archived: false, name: sameName(wallet.name), _id: { $ne: wallet._id } });
    if (clash) return fail(`"${wallet.name}" nomli faol hamyon bor — avval birining nomini o'zgartiring`);
    const last = await Wallet.findOne().sort({ order: -1 }).lean();
    wallet.order = (last?.order ?? -1) + 1;
  }

  wallet.archived = parsed.data.archived;
  await wallet.save();
  refresh();
  return { ok: true };
}

export async function deleteWallet(input: unknown): Promise<ActionResult> {
  await requireActionSession();
  const parsed = z.object({ id: objectId }).safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  await connectDB();

  const wallet = await Wallet.findById(parsed.data.id);
  if (!wallet) return fail("Hamyon topilmadi");
  const [used, transfers, recurring] = await Promise.all([
    Transaction.exists({ walletId: wallet._id }),
    Transfer.exists({ $or: [{ fromWalletId: wallet._id }, { toWalletId: wallet._id }] }),
    Recurring.exists({ walletId: wallet._id }),
  ]);
  if (used || transfers || recurring || wallet.initialBalance !== 0) {
    return fail("Bu hamyonda yozuvlar yoki qoldiq bor — uni faqat yashirish mumkin");
  }
  if (!wallet.archived && (await Wallet.countDocuments({ archived: false, _id: { $ne: wallet._id } })) === 0) {
    return fail("Kamida bitta hamyon qolishi kerak");
  }

  await wallet.deleteOne();
  refresh();
  return { ok: true };
}

export async function moveWallet(input: unknown): Promise<ActionResult> {
  await requireActionSession();
  const parsed = moveSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  await connectDB();

  const list = await Wallet.find({ archived: false }, { _id: 1 }).sort({ order: 1, createdAt: 1 }).lean();
  const ids = list.map((w) => w._id);
  if (!swap(ids, parsed.data.id, parsed.data.direction)) return { ok: true };
  await rewriteOrder(Wallet, ids);
  refresh();
  return { ok: true };
}

// ---------------------------------------------------------------- AI

/** Barcha AI suhbatlari va oylik tahlillarni o'chirish */
export async function clearAiHistory(): Promise<ActionResult> {
  await requireActionSession();
  await connectDB();
  await Promise.all([AiChat.deleteMany({}), AiInsight.deleteMany({})]);
  refresh();
  return { ok: true };
}
