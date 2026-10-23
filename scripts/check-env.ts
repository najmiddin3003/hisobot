/**
 * Deploy'dan oldin .env.local ni tekshiradi: qaysi qatorlar to'ldirilgan va to'g'ri ko'rinishda,
 * MongoDB, Telegram bot va Claude API kalitlari ishlayaptimi. Qiymatlarning o'zi ekranga chiqmaydi.
 *
 *   npm run check-env              — kompyuterdagi ishga tushirish uchun
 *   npm run check-env -- --prod    — Vercel uchun (APP_URL https bo'lishi shart)
 */
import Anthropic from "@anthropic-ai/sdk";
import { Api } from "grammy";
import { connectDB, disconnectDB } from "@/lib/db";
import { loadEnv } from "./_cli";

type Level = "ok" | "warn" | "fail" | "skip";
const ICONS: Record<Level, string> = { ok: "✓", warn: "!", fail: "✗", skip: "–" };

let failed = false;
function report(level: Level, name: string, message: string) {
  if (level === "fail") failed = true;
  console.log(`  ${ICONS[level]} ${name.padEnd(26)} ${message}`);
}

const env = (name: string) => process.env[name]?.trim() ?? "";

function checkSecret(name: string, required: boolean) {
  const value = env(name);
  if (!value) return report(required ? "fail" : "skip", name, required ? "bo'sh — npm run gen:secret" : "bo'sh");
  if (value.length < 32) return report("fail", name, "juda qisqa (kamida 32 belgi) — npm run gen:secret");
  report("ok", name, "bor");
}

async function main() {
  loadEnv();
  const prod = process.argv.includes("--prod");
  console.log(`\n  .env.local tekshiruvi${prod ? " (Vercel uchun)" : ""}\n`);

  // ---- Majburiy ----
  const mongo = env("MONGODB_URI");
  if (!mongo) report("fail", "MONGODB_URI", "bo'sh — Atlas → Connect → Drivers");
  else if (!/^mongodb(\+srv)?:\/\//.test(mongo)) report("fail", "MONGODB_URI", "mongodb:// yoki mongodb+srv:// bilan boshlanishi kerak");
  else report("ok", "MONGODB_URI", "bor");

  checkSecret("AUTH_SECRET", true);
  checkSecret("ENCRYPTION_KEY", true);
  checkSecret("CRON_SECRET", prod);

  const appUrl = env("APP_URL");
  if (!appUrl) report(prod ? "fail" : "warn", "APP_URL", "bo'sh");
  else if (prod && !appUrl.startsWith("https://")) report("fail", "APP_URL", "Vercel manzili https:// bilan bo'lishi kerak");
  else report("ok", "APP_URL", appUrl);

  // ---- Telegram bot (ixtiyoriy; token bo'lsa — qolgan ikkitasi ham kerak) ----
  const botKeys = ["TELEGRAM_BOT_TOKEN", "TELEGRAM_ALLOWED_USER_ID", "TELEGRAM_WEBHOOK_SECRET"];
  if (!env("TELEGRAM_BOT_TOKEN")) {
    report("skip", "Telegram bot", "TELEGRAM_BOT_TOKEN bo'sh — bot o'chiq turadi (ixtiyoriy)");
  } else {
    for (const key of botKeys) if (!env(key)) report("fail", key, "bo'sh — bot uchun uchala qator kerak");
    const id = env("TELEGRAM_ALLOWED_USER_ID");
    if (id && !/^\d+$/.test(id)) report("fail", "TELEGRAM_ALLOWED_USER_ID", "faqat raqam bo'lishi kerak (@userinfobot)");
    const webhookSecret = env("TELEGRAM_WEBHOOK_SECRET");
    if (webhookSecret && !/^[A-Za-z0-9_-]{16,256}$/.test(webhookSecret)) {
      report("fail", "TELEGRAM_WEBHOOK_SECRET", "16–256 belgi: lotin harf, raqam, _ va - (npm run gen:secret)");
    }
  }

  // ---- AI (ixtiyoriy) ----
  if (!env("ANTHROPIC_API_KEY")) report("skip", "ANTHROPIC_API_KEY", "bo'sh — AI yordamchi o'chiq turadi (ixtiyoriy)");

  // ---- Ulanishlarni sinash ----
  console.log("\n  Ulanishlar\n");

  if (mongo) {
    try {
      const { connection } = await connectDB();
      await connection.db?.admin().ping();
      report("ok", "MongoDB", `ulandi (baza: ${connection.name})`);
    } catch (error) {
      report("fail", "MongoDB", `ulanib bo'lmadi: ${(error as Error).message.split("\n")[0]}`);
    } finally {
      await disconnectDB().catch(() => {});
    }
  }

  if (env("TELEGRAM_BOT_TOKEN")) {
    try {
      const me = await new Api(env("TELEGRAM_BOT_TOKEN")).getMe();
      report("ok", "Telegram bot", `@${me.username}`);
      if (prod) {
        const info = await new Api(env("TELEGRAM_BOT_TOKEN")).getWebhookInfo();
        if (!info.url) report("warn", "Telegram webhook", "o'rnatilmagan — deploy'dan keyin: npm run bot:webhook");
        else report(info.last_error_message ? "warn" : "ok", "Telegram webhook", info.last_error_message ?? info.url);
      }
    } catch {
      report("fail", "Telegram bot", "token noto'g'ri (@BotFather'dan qayta oling)");
    }
  }

  if (env("ANTHROPIC_API_KEY")) {
    const model = env("ANTHROPIC_MODEL") || "claude-opus-5-5";
    try {
      // Bepul so'rov: model ma'lumotini olish (token sarflanmaydi)
      await new Anthropic().models.retrieve(model);
      report("ok", "Claude API", `kalit ishlaydi, model: ${model}`);
    } catch (error) {
      if (error instanceof Anthropic.NotFoundError) report("fail", "ANTHROPIC_MODEL", `"${model}" modeli topilmadi`);
      else if (error instanceof Anthropic.AuthenticationError) report("fail", "Claude API", "kalit noto'g'ri");
      else report("warn", "Claude API", `tekshirib bo'lmadi: ${(error as Error).message}`);
    }
  }

  console.log(failed ? "\n  ✗ Yuqoridagi xatolarni tuzating.\n" : "\n  ✓ Hammasi joyida.\n");
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
