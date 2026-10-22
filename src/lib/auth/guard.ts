import "server-only";
import { redirect } from "next/navigation";
import { readWebSession } from "./session";

/** Server action'lar seansni o'zi tekshiradi — mijozdan kelgan so'rovga ishonilmaydi */
export async function requireActionSession() {
  const session = await readWebSession();
  if (session.status !== "ok") redirect(session.reason ? `/login?sabab=${session.reason}` : "/login");
  return session;
}
