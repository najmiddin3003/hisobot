"use server";

import { companionLines } from "@/lib/ai/companion";
import { requireActionSession } from "@/lib/auth/guard";
import { connectDB } from "@/lib/db";

/** Oydin aytadigan gaplar: AI kaliti bo'lsa — Claude yozgani, bo'lmasa — ma'lumotlardan tayyorlangani */
export async function getCompanionLines() {
  await requireActionSession();
  await connectDB();
  return companionLines();
}
