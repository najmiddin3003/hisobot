"use server";

import { isValidObjectId } from "mongoose";
import { refresh } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/app/(app)/kirim-chiqim/actions";
import { requireActionSession } from "@/lib/auth/guard";
import { balanceOf, sumsByWallet } from "@/lib/balances";
import { connectDB } from "@/lib/db";
import { Wallet } from "@/lib/models";

const schema = z.object({
  walletId: z.string().refine((v) => isValidObjectId(v), "Hamyon topilmadi"),
  actual: z
    .number({ error: "Summani kiriting" })
    .int("Summa butun son bo'lishi kerak")
    .min(-1_000_000_000_000)
    .max(1_000_000_000_000, "Summa juda katta"),
});

/**
 * Hamyondagi haqiqiy pulni kiritish: farq boshlang'ich qoldiqqa qo'shiladi,
 * kirim-chiqim yozuvlari o'zgarmaydi.
 */
export async function setWalletBalance(input: unknown): Promise<ActionResult> {
  await requireActionSession();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri" };

  await connectDB();
  const wallet = await Wallet.findOne({ _id: parsed.data.walletId, archived: false });
  if (!wallet) return { ok: false, error: "Hamyon topilmadi" };

  const sums = await sumsByWallet();
  const current = balanceOf(wallet.initialBalance, sums.get(wallet._id));
  wallet.initialBalance += parsed.data.actual - current;
  await wallet.save();

  refresh();
  return { ok: true };
}
