/**
 * Telefon yo'qolsa va zaxira kodlar ham bo'lmasa: Google Authenticator'ni o'chiradi.
 * Keyingi kirishda (login + paroldan keyin) yangi QR kod ko'rsatiladi.
 *
 *   npm run reset-2fa
 */
import { disconnectDB } from "@/lib/db";
import { Session } from "@/lib/models";
import { ask, connectOrExit, findAccountOrExit, loadEnv } from "./_cli";

async function main() {
  loadEnv();
  console.log("\n  Hisob — Google Authenticator'ni qayta o'rnatish\n");
  await connectOrExit();
  const user = await findAccountOrExit();

  const answer = process.env.CONFIRM === "ha" ? "ha" : await ask(`  ${user.username} uchun 2FA o'chirilsinmi? (ha/yo'q): `);
  if (answer.toLowerCase() !== "ha") {
    console.log("  Bekor qilindi.\n");
    return;
  }

  user.totpSecret = null;
  user.totpEnabled = false;
  user.totpLastStep = null;
  user.set("backupCodes", []);
  user.failedLoginCount = 0;
  user.lockedUntil = null;
  await user.save();

  const { modifiedCount } = await Session.updateMany(
    { userId: user._id, status: "active", revokedAt: null, expiresAt: { $gt: new Date() } },
    { revokedAt: new Date(), revokeReason: "two_factor_reset" },
  );

  console.log("\n  ✓ Google Authenticator o'chirildi, eski zaxira kodlar bekor qilindi");
  console.log(`  ✓ Yopilgan seanslar: ${modifiedCount} ta`);
  console.log("    Saytga kirganingizda yangi QR kod ko'rsatiladi.\n");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => disconnectDB());
