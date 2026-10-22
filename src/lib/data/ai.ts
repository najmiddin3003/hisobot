import "server-only";
import { loadInsight } from "@/lib/ai/insight";
import { requireUser } from "@/lib/auth/dal";
import { connectDB } from "@/lib/db";

/** Dashboard: tanlangan oyning saqlangan AI tahlili */
export async function getMonthInsight(month: string) {
  await requireUser();
  await connectDB();
  return loadInsight(month);
}
