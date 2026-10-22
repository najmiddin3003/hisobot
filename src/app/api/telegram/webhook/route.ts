import { webhookCallback } from "grammy";
import { safeEqual } from "@/lib/auth/crypto";
import { getBot } from "@/lib/telegram/bot";

/**
 * Telegram yangilanishlari shu manzilga keladi (Vercel'da). Telegram har so'rovda
 * TELEGRAM_WEBHOOK_SECRET ni sarlavhada yuboradi — boshqa manbadan kelgan so'rovlar rad etiladi.
 */
export async function POST(request: Request) {
  const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secretToken || !process.env.TELEGRAM_BOT_TOKEN) {
    return new Response("Bot sozlanmagan", { status: 503 });
  }
  // Kalit botga (va Telegram API'ga) murojaat qilishdan oldin tekshiriladi
  const header = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!safeEqual(header, secretToken)) {
    return new Response("Ruxsat yo'q", { status: 401 });
  }

  const handle = webhookCallback(getBot(), "std/http", {
    secretToken,
    // Telegram javobni uzoq kutmaydi; vaqt tugasa ham 200 qaytariladi, aks holda u qayta-qayta yuboradi
    onTimeout: "return",
    timeoutMilliseconds: 9_000,
  });
  return handle(request);
}
