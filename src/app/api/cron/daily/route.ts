import { safeEqual } from "@/lib/auth/crypto";
import { connectDB } from "@/lib/db";
import { generateDueRecurring } from "@/lib/recurring";
import { sendDueReminders } from "@/lib/telegram/notify";

/**
 * Har kuni ertalab Vercel Cron chaqiradi (vercel.json): vaqti kelgan takroriy to'lovlarni yozadi
 * va qarz/kredit eslatmalarini Telegram'ga yuboradi. Ikki marta chaqirilsa ham hech narsa takrorlanmaydi.
 * Vercel so'rovga "Authorization: Bearer <CRON_SECRET>" sarlavhasini o'zi qo'shadi.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ ok: false, error: "CRON_SECRET sozlanmagan" }, { status: 503 });
  const header = request.headers.get("authorization") ?? "";
  if (!safeEqual(header, `Bearer ${secret}`)) {
    return Response.json({ ok: false, error: "Ruxsat yo'q" }, { status: 401 });
  }

  const now = new Date();
  await connectDB();
  const recurring = await generateDueRecurring(now);
  const reminders = await sendDueReminders(now);
  return Response.json({ ok: true, recurring, reminders, at: now.toISOString() });
}
