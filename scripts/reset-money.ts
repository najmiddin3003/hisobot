/**
 * Pul yozuvlarini nolga tushiradi: hamma hamyon qoldig'i 0 bo'ladi, hisobotlar bo'shaydi.
 *
 *   npm run reset-money
 *
 * O'chiriladi (savatchadagilar ham): kirim-chiqimlar, o'tkazmalar, qarz va kreditlar, AI tahlillari.
 * Nolga tushiriladi: hamyonlarning boshlang'ich qoldig'i, jamg'arma maqsadlarida yig'ilgan summa.
 * Tegilmaydi: akkaunt, seanslar, hamyonlar, kategoriyalar, takroriy to'lov shablonlari, kurslar.
 *
 * So'ramasdan bajarish uchun: RESET_CONFIRM=ha
 */
import { disconnectDB } from "@/lib/db";
import { AiInsight, CompanionCache, Debt, Goal, Transaction, Transfer, Wallet } from "@/lib/models";
import { ask, connectOrExit, loadEnv } from "./_cli";

async function main() {
  loadEnv();
  console.log("\n  Hisob — pul yozuvlarini nolga tushirish\n");
  await connectOrExit();

  const [transactions, transfers, debts, wallets, goals] = await Promise.all([
    Transaction.countDocuments(),
    Transfer.countDocuments(),
    Debt.countDocuments(),
    Wallet.countDocuments({ initialBalance: { $ne: 0 } }),
    Goal.countDocuments({ savedAmount: { $ne: 0 } }),
  ]);

  console.log(`  Kirim-chiqimlar:          ${transactions} ta — o'chiriladi`);
  console.log(`  O'tkazmalar:              ${transfers} ta — o'chiriladi`);
  console.log(`  Qarz va kreditlar:        ${debts} ta — o'chiriladi`);
  console.log(`  Hamyon boshlang'ich qoldig'i: ${wallets} ta — 0 qilinadi`);
  console.log(`  Maqsadlarda yig'ilgan:    ${goals} ta — 0 qilinadi\n`);
  console.log("  ! Bu amalni qaytarib bo'lmaydi. Kerak bo'lsa, avval Atlas'da zaxira nusxa oling.\n");

  const answer = process.env.RESET_CONFIRM ?? (await ask('Davom etish uchun "ha" deb yozing: '));
  if (answer.toLowerCase() !== "ha") {
    console.log("\n  Bekor qilindi — hech narsa o'zgarmadi.\n");
    return;
  }

  const [tx, tr, debt, wallet, goal] = await Promise.all([
    Transaction.deleteMany({}),
    Transfer.deleteMany({}),
    Debt.deleteMany({}),
    Wallet.updateMany({}, { initialBalance: 0 }),
    Goal.updateMany({}, { savedAmount: 0 }),
    // Eski summalar AI tahlili va Oydin gaplarida qolib ketmasin
    AiInsight.deleteMany({}),
    CompanionCache.deleteMany({}),
  ]);

  console.log(`\n  ✓ O'chirildi: ${tx.deletedCount} kirim-chiqim, ${tr.deletedCount} o'tkazma, ${debt.deletedCount} qarz/kredit`);
  console.log(`  ✓ Nolga tushirildi: ${wallet.modifiedCount} hamyon, ${goal.modifiedCount} maqsad`);
  console.log("  ✓ Barcha hamyon qoldiqlari endi 0\n");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => disconnectDB());
