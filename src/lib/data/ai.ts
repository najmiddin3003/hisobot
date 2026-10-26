import "server-only";
import { loadInsight } from "@/lib/ai/insight";
import { readAsUser } from "@/lib/auth/dal";

/** Dashboard: tanlangan oyning saqlangan AI tahlili */
export async function getMonthInsight(month: string) {
  return readAsUser(async () => {
    return loadInsight(month);
  });
}
