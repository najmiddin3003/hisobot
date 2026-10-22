/**
 * Botni kompyuterda ishga tushirish (polling rejimi — webhook kerak emas).
 *
 *   npm run bot:dev
 *
 * .env.local da TELEGRAM_BOT_TOKEN, TELEGRAM_ALLOWED_USER_ID va MONGODB_URI bo'lishi kerak.
 * Diqqat: polling ishlayotganda webhook o'chiriladi — saytni Vercel'ga joylagandan keyin
 * npm run bot:webhook ni qayta ishga tushiring.
 */
import { getBot } from "@/lib/telegram/bot";
import { loadEnv } from "./_cli";

async function main() {
  loadEnv();
  for (const key of ["TELEGRAM_BOT_TOKEN", "TELEGRAM_ALLOWED_USER_ID", "MONGODB_URI"]) {
    if (!process.env[key]) {
      console.error(`  ✗ .env.local faylida ${key} ko'rsatilmagan`);
      process.exit(1);
    }
  }

  const bot = getBot();
  await bot.api.deleteWebhook();
  console.log("\n  Bot ishga tushyapti (polling)... To'xtatish: Ctrl+C\n");
  await bot.start({
    allowed_updates: ["message", "callback_query"],
    onStart: (info) => console.log(`  ✓ @${info.username} tayyor. Telegram'da botga yozing.\n`),
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
