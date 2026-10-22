/**
 * Telegram'ga botning webhook manzilini aytadi (sayt Vercel'ga joylangandan keyin bir marta).
 *
 *   npm run bot:webhook
 *
 * Manzil: APP_URL + /api/telegram/webhook (APP_URL — https bilan, masalan https://hisob.vercel.app)
 */
import { Api } from "grammy";
import { loadEnv } from "./_cli";

async function main() {
  loadEnv();
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const appUrl = process.env.APP_URL?.replace(/\/$/, "");
  if (!token || !secret || !appUrl?.startsWith("https://")) {
    console.error("  ✗ TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET va https bilan boshlanadigan APP_URL kerak");
    process.exit(1);
  }

  const api = new Api(token);
  const url = `${appUrl}/api/telegram/webhook`;
  await api.setWebhook(url, {
    secret_token: secret,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: true,
  });
  const info = await api.getWebhookInfo();
  console.log(`\n  ✓ Webhook o'rnatildi: ${info.url}`);
  if (info.last_error_message) console.log(`  ! Oxirgi xato: ${info.last_error_message}`);
  console.log();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
