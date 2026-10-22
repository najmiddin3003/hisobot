/**
 * Parolni unutganda: yangi parol o'rnatadi, blokni olib tashlaydi va barcha seanslarni yopadi.
 *
 *   npm run reset-password
 */
import bcrypt from "bcryptjs";
import { disconnectDB } from "@/lib/db";
import { Session } from "@/lib/models";
import { connectOrExit, findAccountOrExit, loadEnv, promptNewPassword } from "./_cli";

async function main() {
  loadEnv();
  console.log("\n  Hisob — parolni tiklash\n");
  await connectOrExit();
  const user = await findAccountOrExit();
  console.log(`  Akkaunt: ${user.username}\n`);

  const password = await promptNewPassword();
  user.passwordHash = await bcrypt.hash(password, 12);
  user.failedLoginCount = 0;
  user.lockedUntil = null;
  await user.save();

  const { modifiedCount } = await Session.updateMany(
    { userId: user._id, status: "active", revokedAt: null, expiresAt: { $gt: new Date() } },
    { revokedAt: new Date(), revokeReason: "password_changed" },
  );

  console.log("\n  ✓ Parol yangilandi, blok olib tashlandi");
  console.log(`  ✓ Yopilgan seanslar: ${modifiedCount} ta (sayt va bot)\n`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => disconnectDB());
