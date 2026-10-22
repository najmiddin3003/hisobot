/**
 * Birinchi sozlash: akkaunt yaratadi, standart kategoriya va hamyonlarni qo'shadi.
 * Qayta ishga tushirish xavfsiz — mavjud ma'lumotlarga tegmaydi.
 *
 *   npm run setup
 *
 * Avtomatik rejim uchun (masalan, test): SETUP_LOGIN va SETUP_PASSWORD muhit o'zgaruvchilari.
 */
import bcrypt from "bcryptjs";
import { disconnectDB } from "@/lib/db";
import { DEFAULT_CATEGORIES, DEFAULT_WALLETS } from "@/lib/defaults";
import * as models from "@/lib/models";
import { ask, connectOrExit, loadEnv, promptNewPassword } from "./_cli";

const { Category, User, Wallet } = models;

const LOGIN_RE = /^[a-z0-9_.-]{3,32}$/;

async function promptUsername() {
  const envLogin = process.env.SETUP_LOGIN?.toLowerCase();
  if (envLogin && LOGIN_RE.test(envLogin)) return envLogin;

  while (true) {
    const username = (await ask("Login (3–32 belgi: lotin harflari, raqam, _ . -): ")).toLowerCase();
    if (LOGIN_RE.test(username)) return username;
    console.log("  ✗ Login noto'g'ri, qaytadan kiriting.");
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
  loadEnv();
  console.log("\n  Hisob — birinchi sozlash\n");

  await connectOrExit();
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
    const username = await promptUsername();
    const password = await promptNewPassword();
    await User.create({ username, passwordHash: await bcrypt.hash(password, 12) });
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
