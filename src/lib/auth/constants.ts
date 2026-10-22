// Proxy (cookie bor-yo'qligini tekshirish) va server kodi uchun umumiy sozlamalar.
// Bu fayl node:crypto yoki bazani import qilmasligi kerak.

const isProduction = process.env.NODE_ENV === "production";

/** __Host- prefiksi: cookie faqat HTTPS orqali, faqat shu domen uchun va path=/ bilan o'rnatiladi */
export const SESSION_COOKIE = isProduction ? "__Host-hn_session" : "hn_session";
export const PENDING_COOKIE = isProduction ? "__Host-hn_pending" : "hn_pending";

export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
/** Parol kiritilgandan keyin Google Authenticator kodini kiritish uchun vaqt */
export const PENDING_TTL_MS = 5 * 60 * 1000;

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_DURATION_MS = 15 * 60 * 1000;

export const MIN_PASSWORD_LENGTH = 8;
export const BACKUP_CODE_COUNT = 8;

/** Login sahifasida ko'rsatiladigan xabar: /login?sabab=... */
export const LOGIN_REASONS = {
  "yangi-kirish": "Hisobingizga boshqa qurilmadan kirildi, shuning uchun bu seans yopildi.",
  muddat: "Seans muddati (12 soat) tugadi. Qaytadan kiring.",
  chiqildi: "Tizimdan chiqdingiz.",
  vaqt: "Kodni kiritish vaqti tugadi. Login va parolni qaytadan kiriting.",
  bloklandi: "Juda ko'p noto'g'ri urinish. 15 daqiqadan keyin qayta urinib ko'ring.",
  parol: "Parol o'zgartirildi. Yangi parol bilan kiring.",
  yopildi: "Seans yopildi. Qaytadan kiring.",
} as const;
export type LoginReason = keyof typeof LOGIN_REASONS;
