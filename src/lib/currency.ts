// Valyutalar: hamyon o'z valyutasida yuradi, hisobotlar so'mda. Server va brauzer uchun umumiy.
//
// Summalar butun son sifatida eng kichik birlikda saqlanadi:
//   so'm — so'mda, dollar/yevro/USDT — sentda (×100), bitkoin — satoshida (×100 000 000).

export const CURRENCIES = ["UZS", "USD", "EUR", "USDT", "BTC"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const CURRENCY_META: Record<Currency, { name: string; symbol: string; decimals: number }> = {
  UZS: { name: "O'zbek so'mi", symbol: "so'm", decimals: 0 },
  USD: { name: "AQSh dollari", symbol: "$", decimals: 2 },
  EUR: { name: "Yevro", symbol: "€", decimals: 2 },
  USDT: { name: "Tether (USDT)", symbol: "USDT", decimals: 2 },
  BTC: { name: "Bitkoin", symbol: "BTC", decimals: 8 },
};

/** Kurslar: 1 birlik valyuta necha so'm (UZS doim 1) */
export type Rates = Record<Currency, number>;

export function isCurrency(value: unknown): value is Currency {
  return typeof value === "string" && (CURRENCIES as readonly string[]).includes(value);
}

/** Bazadagi eski hujjatlarda valyuta bo'lmasa — so'm */
export function currencyOf(doc: { currency?: string | null } | null | undefined): Currency {
  return isCurrency(doc?.currency) ? doc.currency : "UZS";
}

const scale = (currency: Currency) => 10 ** CURRENCY_META[currency].decimals;

/** Eng kichik birlikdan oddiy songa: 1250 sent → 12.5 */
export function fromMinor(minor: number, currency: Currency) {
  return minor / scale(currency);
}

/** Oddiy sondan eng kichik birlikka: 12.5 → 1250 sent */
export function toMinor(value: number, currency: Currency) {
  return Math.round(value * scale(currency));
}

/** Valyutadagi summa so'mda (butun so'mgacha yaxlitlanadi) */
export function minorToUzs(minor: number, currency: Currency, rate: number) {
  return currency === "UZS" ? minor : Math.round(fromMinor(minor, currency) * rate);
}

const NBSP = " ";
const group = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);

/**
 * Raqam qismi: "1 250 000" (so'm), "1 250,50" (dollar), "0,00125" (bitkoin — ortiqcha nollarsiz).
 * Kasr ajratuvchisi vergul (o'zbekcha yozuv).
 */
export function formatMinor(minor: number, currency: Currency) {
  const { decimals } = CURRENCY_META[currency];
  const abs = Math.abs(minor);
  if (decimals === 0) return group(String(Math.round(abs)));
  const whole = Math.floor(abs / scale(currency));
  let fraction = String(abs % scale(currency)).padStart(decimals, "0");
  // Bitkoin: 0,00125000 → 0,00125; dollar: doim 2 xona
  if (currency === "BTC") fraction = fraction.replace(/0+$/, "").padEnd(2, "0");
  return `${group(String(whole))},${fraction}`;
}

/** To'liq yozuv: "1 250 000 so'm", "1 250,50 $", "0,00125 BTC"; sign — "+"/"−" belgisi */
export function formatCurrency(minor: number, currency: Currency, options: { sign?: boolean } = {}) {
  const prefix = minor < 0 ? "−" : options.sign && minor > 0 ? "+" : "";
  return `${prefix}${formatMinor(minor, currency)}${NBSP}${CURRENCY_META[currency].symbol}`;
}

/**
 * Yozilgan matndan eng kichik birlikdagi summa: "12,5" → 1250 (dollar). Raqam bo'lmagan belgilar
 * tashlanadi, kasr qismi valyuta xonasidan uzun bo'lsa kesiladi. Bo'sh bo'lsa 0.
 */
export function parseMinor(text: string, currency: Currency) {
  const { decimals } = CURRENCY_META[currency];
  // So'mda kasr yo'q: "1.500.000" ham, "1 500 000" ham — bir yarim million
  if (decimals === 0) {
    const digits = text.replace(/\D/g, "");
    return digits ? Number(digits) : 0;
  }
  // Oxirgi nuqta yoki vergul — kasr ajratuvchisi, oldingilari — minglik ajratuvchilar
  const cleaned = text.replace(/[^\d.,]/g, "");
  const sep = Math.max(cleaned.lastIndexOf(","), cleaned.lastIndexOf("."));
  const whole = (sep >= 0 ? cleaned.slice(0, sep) : cleaned).replace(/\D/g, "");
  const fraction = sep >= 0 ? cleaned.slice(sep + 1).replace(/\D/g, "").slice(0, decimals) : "";
  const minor = Number(whole || "0") * scale(currency) + Number(fraction.padEnd(decimals, "0"));
  return Number.isFinite(minor) ? minor : 0;
}

/** Kursni o'qishga qulay: "1 $ = 11 838,92 so'm" */
export function formatRate(currency: Currency, rate: number) {
  const value = Math.round(rate * 100) / 100;
  const [whole, fraction] = value.toFixed(2).split(".");
  const text = fraction === "00" ? group(whole) : `${group(whole)},${fraction}`;
  return `1 ${CURRENCY_META[currency].symbol} = ${text} so'm`;
}
