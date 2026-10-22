import { requireUser } from "@/lib/auth/dal";

/** Seansni bazadan tekshiradi; yaroqsiz bo'lsa login sahifasiga yuboradi. Hech narsa chizmaydi */
export async function AuthCheck() {
  await requireUser();
  return null;
}
