import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";

function requireSecret(name: "AUTH_SECRET" | "ENCRYPTION_KEY") {
  const value = process.env[name];
  if (!value || value.length < 32) {
    throw new Error(`${name} .env.local faylida ko'rsatilmagan (yaratish: npm run gen:secret)`);
  }
  return value;
}

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

/** Token/kodning bazada saqlanadigan xeshi (AUTH_SECRET bilan HMAC) */
export function hashToken(token: string) {
  return createHmac("sha256", requireSecret("AUTH_SECRET")).update(token).digest("hex");
}

export function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

// ---- AES-256-GCM shifrlash (Google Authenticator kaliti uchun) ----

function encryptionKey() {
  return createHash("sha256").update(requireSecret("ENCRYPTION_KEY")).digest();
}

export function encrypt(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${data.toString("base64url")}`;
}

export function decrypt(payload: string) {
  const [version, iv, tag, data] = payload.split(".");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("Shifrlangan ma'lumot formati noto'g'ri");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}

// ---- Zaxira kodlar ----

// Chalkashtiriladigan belgilarsiz (0/O, 1/I/L): 32 belgi × 10 = 50 bit
const BACKUP_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** "K7M2P-QX9RT" ko'rinishidagi zaxira kod */
export function generateBackupCode() {
  const chars = Array.from({ length: 10 }, () => BACKUP_ALPHABET[randomInt(BACKUP_ALPHABET.length)]);
  return `${chars.slice(0, 5).join("")}-${chars.slice(5).join("")}`;
}

export function normalizeBackupCode(input: string) {
  return input.toUpperCase().replace(/[^0-9A-Z]/g, "");
}

export function hashBackupCode(code: string) {
  return hashToken(`backup:${normalizeBackupCode(code)}`);
}
