import "server-only";
import QRCode from "qrcode";
import type { HydratedDocument } from "mongoose";
import type { UserDoc } from "@/lib/models";
import { BACKUP_CODE_COUNT } from "./constants";
import { decrypt, encrypt, generateBackupCode, hashBackupCode } from "./crypto";
import { formatSecretForDisplay, generateTotpSecret, otpauthUrl } from "./totp";

/**
 * Google Authenticator ulash uchun QR kod. Kalit birinchi marta yaratiladi va
 * shifrlangan holda saqlanadi — sahifa yangilansa ham QR o'zgarmaydi.
 */
export async function prepareTotpSetup(user: HydratedDocument<UserDoc>) {
  let secret: string;
  if (user.totpSecret) {
    secret = decrypt(user.totpSecret);
  } else {
    secret = generateTotpSecret();
    user.totpSecret = encrypt(secret);
    await user.save();
  }

  const qr = await QRCode.toDataURL(otpauthUrl({ secret, account: user.username }), {
    margin: 1,
    width: 220,
    errorCorrectionLevel: "M",
  });
  return { qr, secret: formatSecretForDisplay(secret), username: user.username };
}

/** Yangi zaxira kodlar: foydalanuvchiga ochiq holda qaytadi, bazaga faqat xeshi yoziladi */
export function issueBackupCodes(user: HydratedDocument<UserDoc>) {
  const codes = Array.from({ length: BACKUP_CODE_COUNT }, generateBackupCode);
  user.set(
    "backupCodes",
    codes.map((code) => ({ hash: hashBackupCode(code), usedAt: null })),
  );
  return codes;
}

export function backupCodesLeft(user: Pick<UserDoc, "backupCodes">) {
  return user.backupCodes.filter((c) => !c.usedAt).length;
}
