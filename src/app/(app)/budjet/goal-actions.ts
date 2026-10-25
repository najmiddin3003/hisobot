"use server";

import { isValidObjectId } from "mongoose";
import { refresh } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/app/(app)/kirim-chiqim/actions";
import { requireActionSession } from "@/lib/auth/guard";
import { fromDateInput } from "@/lib/dates";
import { connectDB } from "@/lib/db";
import { isIconName } from "@/lib/icons";
import { Goal } from "@/lib/models";

const fail = (error: string): ActionResult => ({ ok: false, error });
const firstIssue = (error: z.ZodError) => fail(error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri");
const objectId = z.string().refine((v) => isValidObjectId(v), "Maqsad topilmadi");
const MAX = 1_000_000_000_000;

const goalSchema = z.object({
  id: objectId.optional(),
  name: z.string().trim().min(1, "Maqsad nomini yozing").max(60, "Nomi juda uzun (60 belgigacha)"),
  targetAmount: z.number({ error: "Summani kiriting" }).int().min(1, "Qancha kerakligini yozing").max(MAX, "Summa juda katta"),
  icon: z.string().refine(isIconName, "Ikonkani tanlang"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Rangni tanlang"),
  /** "YYYY-MM-DD" yoki bo'sh */
  deadline: z.string().default(""),
});

export async function saveGoal(input: unknown): Promise<ActionResult> {
  await requireActionSession();
  const parsed = goalSchema.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  const { id, deadline, ...data } = parsed.data;
  const deadlineDate = deadline ? fromDateInput(deadline) : null;
  if (deadline && !deadlineDate) return fail("Muddatni to'g'ri tanlang");

  await connectDB();
  if (id) {
    const updated = await Goal.updateOne({ _id: id }, { ...data, deadline: deadlineDate });
    if (updated.matchedCount === 0) return fail("Maqsad topilmadi");
  } else {
    const last = await Goal.findOne().sort({ order: -1 }).lean();
    await Goal.create({ ...data, deadline: deadlineDate, order: (last?.order ?? -1) + 1 });
  }
  refresh();
  return { ok: true };
}

/** Maqsadga pul qo'shish (musbat) yoki undan olish (manfiy); 0 dan pastga tushmaydi */
export async function depositGoal(input: unknown): Promise<ActionResult> {
  await requireActionSession();
  const parsed = z
    .object({ id: objectId, amount: z.number().int().min(-MAX).max(MAX).refine((v) => v !== 0, "Summani kiriting") })
    .safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);

  await connectDB();
  const goal = await Goal.findById(parsed.data.id);
  if (!goal) return fail("Maqsad topilmadi");
  goal.savedAmount = Math.max(goal.savedAmount + parsed.data.amount, 0);
  await goal.save();
  refresh();
  return { ok: true };
}

export async function deleteGoal(input: unknown): Promise<ActionResult> {
  await requireActionSession();
  const parsed = z.object({ id: objectId }).safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  await connectDB();
  await Goal.deleteOne({ _id: parsed.data.id });
  refresh();
  return { ok: true };
}
