/**
 * Birinchi sozlash: akkaunt yaratadi, standart kategoriya va hamyonlarni qo'shadi.
 * Qayta ishga tushirish xavfsiz — mavjud ma'lumotlarga tegmaydi.
 *
 *   npm run setup
 *
 * Avtomatik rejim uchun (masalan, test): SETUP_LOGIN va SETUP_PASSWORD muhit o'zgaruvchilari.
 */
import { existsSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import bcrypt from "bcryptjs";
import { connectDB, disconnectDB } from "@/lib/db";
import { DEFAULT_CATEGORIES, DEFAULT_WALLETS } from "@/lib/defaults";
import * as models from "@/lib/models";

const { Category, User, Wallet } = models;

const LOGIN_RE = /^[a-z0-9_.-]{3,32}$/;
const MIN_PASSWORD_LENGTH = 8;

async function ask(question: string) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}

/** Parolni yulduzchalar bilan so'raydi (terminal qo'llamasa — oddiy kiritish) */
function askHidden(question: string): Promise<string> {
  const stdin = process.stdin;
  if (!stdin.isTTY) return ask(question);

  process.stdout.write(question);
  return new Promise((resolve) => {
    let value = "";
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === "\r" || char === "\n") {
          stdin.off("data", onData);
          stdin.setRawMode(false);
          stdin.pause();
          process.stdout.write("\n");
          resolve(value);
          return;
        }
        if (char === "\u0003") {
          process.stdout.write("\n");
          process.exit(130);
        }
        if (char === "\u007f" || char === "\b") {
          if (value) {
            value = value.slice(0, -1);
            process.stdout.write("\b \b");
          }
          continue;
        }
        value += char;
        process.stdout.write("*");
      }
    };
    stdin.on("data", onData);
  });
}

async function promptCredentials() {
  const envLogin = process.env.SETUP_LOGIN;
  const envPassword = process.env.SETUP_PASSWORD;
  if (envLogin && envPassword) return { username: envLogin.toLowerCase(), password: envPassword };

  let username = "";
  while (!LOGIN_RE.test(username)) {
    username = (await ask("Login (3–32 belgi: lotin harflari, raqam, _ . -): ")).toLowerCase();
    if (!LOGIN_RE.test(username)) console.log("  ✗ Login noto'g'ri, qaytadan kiriting.");
  }

  if (!process.stdin.isTTY) console.log("  ! Bu terminalda parol yashirilmaydi — atrofingizga e'tibor bering.");

  while (true) {
    const password = await askHidden(`Parol (kamida ${MIN_PASSWORD_LENGTH} belgi): `);
    if (password.length < MIN_PASSWORD_LENGTH) {
      console.log(`  ✗ Parol kamida ${MIN_PASSWORD_LENGTH} belgidan iborat bo'lishi kerak.`);
      continue;
    }
    const confirm = await askHidden("Parolni takrorlang: ");
    if (password !== confirm) {
      console.log("  ✗ Parollar mos kelmadi, qaytadan kiriting.");
      continue;
    }
    return { username, password };
  }
}

async function seedCategories() {
  let created = 0;

  // Tizim kategoriyalari doim bo'lishi shart (qarz/kredit amallari shularga yoziladi)
  for (const [order, category] of DEFAULT_CATEGORIES.entries()) {
    if (!category.systemKey) continue;
    const result = await Category.updateOne(
      { systemKey: category.systemKey },
      { $setOnInsert: { ...category, order } },
      { upsert: true },
    );
    created += result.upsertedCount;
  }

  // Oddiy kategoriyalar faqat birinchi marta qo'shiladi — keyin foydalanuvchi o'zi boshqaradi
  const hasCustom = await Category.exists({ systemKey: null });
  if (!hasCustom) {
    const regular = [...DEFAULT_CATEGORIES.entries()]
      .filter(([, c]) => !c.systemKey)
      .map(([order, c]) => ({ ...c, order }));
    await Category.insertMany(regular);
    created += regular.length;
  }

  return created;
}

async function seedWallets() {
  if (await Wallet.exists({})) return 0;
  await Wallet.insertMany(DEFAULT_WALLETS.map((wallet, order) => ({ ...wallet, order })));
  return DEFAULT_WALLETS.length;
}

async function main() {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");

  console.log("\n  Hisob — birinchi sozlash\n");

  try {
    await connectDB();
  } catch (error) {
    console.error(`  ✗ MongoDB'ga ulanib bo'lmadi: ${error instanceof Error ? error.message : error}`);
    console.error("    .env.local faylidagi MONGODB_URI ni tekshiring.\n");
    process.exitCode = 1;
    return;
  }
  console.log("  ✓ MongoDB'ga ulandi");

  await Promise.all(Object.values(models).map((model) => model.createIndexes()));
  console.log("  ✓ Indekslar tayyor");

  const categories = await seedCategories();
  console.log(`  ✓ Kategoriyalar: ${categories ? `${categories} ta qo'shildi` : "allaqachon bor"}`);

  const wallets = await seedWallets();
  console.log(`  ✓ Hamyonlar: ${wallets ? `${wallets} ta qo'shildi` : "allaqachon bor"}`);

  const existing = await User.findOne().lean();
  if (existing) {
    console.log(`  ✓ Akkaunt allaqachon mavjud: ${existing.username}`);
  } else {
    console.log("\n  Akkaunt yaratamiz (saytga va botga shu login-parol bilan kirasiz):\n");
    const { username, password } = await promptCredentials();
    const passwordHash = await bcrypt.hash(password, 12);
    await User.create({ username, passwordHash });
    console.log(`\n  ✓ Akkaunt yaratildi: ${username}`);
    console.log("    Google Authenticator birinchi kirishda saytda ulanadi.");
  }

  console.log("\n  Tayyor! Endi: npm run dev\n");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => disconnectDB());
