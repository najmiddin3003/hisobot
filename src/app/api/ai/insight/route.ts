import { NOT_CONFIGURED_MESSAGE, aiConfigured } from "@/lib/ai/client";
import { generateInsight } from "@/lib/ai/insight";
import { readWebSession } from "@/lib/auth/session";
import { connectDB } from "@/lib/db";
import { currentMonthKey, isMonthKey } from "@/lib/dates";
import { generateDueRecurring } from "@/lib/recurring";

export const maxDuration = 300;

/** Dashboard'dagi "Tahlil qilish / Yangilash" tugmasi: oyni qayta tahlil qilib saqlaydi */
export async function POST(request: Request) {
  const session = await readWebSession();
  if (session.status !== "ok") {
    return Response.json({ error: "Seans tugagan. Qaytadan kiring." }, { status: 401 });
  }
  if (!aiConfigured()) return Response.json({ error: NOT_CONFIGURED_MESSAGE }, { status: 503 });

  const body = (await request.json().catch(() => null)) as { month?: unknown } | null;
  const now = new Date();
  const month = body?.month;
  if (!isMonthKey(month) || month > currentMonthKey(now)) {
    return Response.json({ error: "Oy noto'g'ri" }, { status: 400 });
  }

  await connectDB();
  // Bu oyning takroriy to'lovlari tahlilga kirishi uchun
  await generateDueRecurring();

  const result = await generateInsight(month, now);
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json({ insight: result.insight });
}
