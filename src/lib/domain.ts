// Tizim bo'ylab ishlatiladigan qiymatlar ro'yxati (DB enum'lari va UI uchun bitta manba)

export const TX_TYPES = ["kirim", "chiqim"] as const;
export type TxType = (typeof TX_TYPES)[number];

/** Yozuv qayerdan kiritilgani: sayt, Telegram bot yoki tizimning o'zi (takroriy to'lov) */
export const SOURCES = ["web", "telegram", "auto"] as const;
export type Source = (typeof SOURCES)[number];

export const SOURCE_LABELS: Record<Source, string> = {
  web: "Sayt",
  telegram: "Telegram",
  auto: "Avtomatik",
};

export const WALLET_KINDS = ["naqd", "karta", "boshqa"] as const;
export type WalletKind = (typeof WALLET_KINDS)[number];

/** olingan — men qarzdorman (Qarzlar bo'limi), berilgan — menga qarzdor (Xaq bo'limi) */
export const DEBT_DIRECTIONS = ["olingan", "berilgan"] as const;
export type DebtDirection = (typeof DEBT_DIRECTIONS)[number];

export const DEBT_KINDS = ["shaxs", "kredit"] as const;
export type DebtKind = (typeof DEBT_KINDS)[number];

export const DEBT_STATUSES = ["ochiq", "yopilgan"] as const;
export type DebtStatus = (typeof DEBT_STATUSES)[number];

/** Qarzga bog'langan yozuvning roli: qarzning o'zi (olish/berish) yoki uni qaytarish */
export const DEBT_ROLES = ["asosiy", "tolov"] as const;
export type DebtRole = (typeof DEBT_ROLES)[number];

/**
 * Tizim kategoriyalari — qarz/kredit amallari va oylik shu kategoriyalarga yoziladi.
 * Ular o'chirilmaydi, faqat nomi/rangini o'zgartirish mumkin.
 */
export const SYSTEM_CATEGORY_KEYS = [
  "oylik",
  "qarz_olindi",
  "qarz_qaytarildi",
  "kredit_olindi",
  "qarz_berildi",
  "qarz_qaytardim",
  "kredit_tolovi",
] as const;
export type SystemCategoryKey = (typeof SYSTEM_CATEGORY_KEYS)[number];

export const SESSION_CHANNELS = ["web", "telegram"] as const;
export type SessionChannel = (typeof SESSION_CHANNELS)[number];

export const SESSION_STATUSES = ["pending", "active"] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

/** Seans nima sababdan yopilgani */
export const REVOKE_REASONS = [
  "new_login",
  "logout",
  "manual",
  "password_changed",
  "two_factor_reset",
] as const;
export type RevokeReason = (typeof REVOKE_REASONS)[number];

export const REVOKE_REASON_LABELS: Record<RevokeReason, string> = {
  new_login: "Boshqa qurilmadan kirildi",
  logout: "Chiqib ketildi",
  manual: "Qo'lda yopildi",
  password_changed: "Parol o'zgartirildi",
  two_factor_reset: "2FA qayta o'rnatildi",
};
