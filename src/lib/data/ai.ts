import "server-only";
import { loadInsight } from "@/lib/ai/insight";
import { readAsUser } from "@/lib/auth/dal";
import { resolveMonthParam } from "@/lib/dates";

/** Dashboard: tanlangan oyning saqlangan AI tahlili (?oy= qiymati; oy so'rov paytida aniqlanadi — joriy vaqt kerak) */
export async function getMonthInsight(monthParam: unknown) {
  return readAsUser(async () => {
    return loadInsight(resolveMonthParam(monthParam));
  });
}
