// Google Authenticator bilan mos TOTP (RFC 6238): HMAC-SHA1, 30 soniya, 6 raqam
import { createHmac, randomBytes } from "node:crypto";
import { safeEqual } from "./crypto";

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const PERIOD_SECONDS = 30;
const DIGITS = 6;

export function base32Encode(data: Buffer) {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of data) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32[(value << (5 - bits)) & 31];
  return output;
}

export function base32Decode(input: string) {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    value = (value << 5) | BASE32.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** 160 bitli tasodifiy kalit (base32) */
export function generateTotpSecret() {
  return base32Encode(randomBytes(20));
}

export function hotp(key: Buffer, counter: number, digits = DIGITS) {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", key).update(message).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 10 ** digits;
  return String(code).padStart(digits, "0");
}

export function totpStep(timeMs = Date.now()) {
  return Math.floor(timeMs / 1000 / PERIOD_SECONDS);
}

/**
 * Kodni tekshiradi: joriy, oldingi va keyingi 30 soniyalik oraliq qabul qilinadi
 * (telefon soati biroz farq qilsa ham ishlashi uchun). Mos kelgan qadamni qaytaradi.
 * lastUsedStep dan oldingi yoki unga teng qadamlar rad etiladi — bir kod ikki marta ishlamaydi.
 */
export function verifyTotp(
  secret: string,
  code: string,
  { now = Date.now(), lastUsedStep = null }: { now?: number; lastUsedStep?: number | null } = {},
) {
  if (!/^\d{6}$/.test(code)) return null;
  const key = base32Decode(secret);
  const current = totpStep(now);
  for (const step of [current - 1, current, current + 1]) {
    if (lastUsedStep !== null && step <= lastUsedStep) continue;
    if (safeEqual(hotp(key, step), code)) return step;
  }
  return null;
}

export function otpauthUrl({ secret, account, issuer = "Hisob" }: { secret: string; account: string; issuer?: string }) {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: String(DIGITS),
    period: String(PERIOD_SECONDS),
  });
  return `otpauth://totp/${label}?${params}`;
}

/** Qo'lda kiritish uchun: "ABCD EFGH IJKL ..." */
export function formatSecretForDisplay(secret: string) {
  return secret.replace(/(.{4})/g, "$1 ").trim();
}
