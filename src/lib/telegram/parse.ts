import { toMinor, type Currency } from "@/lib/currency";

// Botga yozilgan matnni tushunish: "45000 taksi", "45 000 taksi", "45k kofe", "1.5 mln ijara", "+12000000 oylik"

const UNITS: Record<string, number> = {
  k: 1_000,
  ming: 1_000,
  m: 1_000_000,
  mln: 1_000_000,
  million: 1_000_000,
  mlrd: 1_000_000_000,
};

// Raqam: "1 500 000" (bo'shliq bilan guruhlangan) yoki "1500000", ixtiyoriy kasr qismi va birlik
const AMOUNT_RE = /^(\d{1,3}(?:[  ]\d{3})+|\d+)(?:[.,](\d+))?\s*(k|ming|mln|million|mlrd|m)?(?=\s|$|[$€₿₮])/i;

/** Summadan oldin yoziladigan belgilar: "$20", "€15", "₿0.001" */
const PREFIX_SYMBOLS: Record<string, Currency> = { $: "USD", "€": "EUR", "₿": "BTC", "₮": "USDT" };

/** Summadan keyingi valyuta: "20$", "20 usd", "15 yevro", "0.001 btc", "100 usdt", "45000 so'm" */
const SUFFIX_RE =
  /^\s*(?:([$€₿₮])|(usdt|tether|usd|dollar|dollor|доллар|eur|euro|yevro|evro|евро|btc|bitkoin|bitcoin|биткоин|so['ʻ’`]?m|sum|сум)(?=\s|$))/i;

const SUFFIX_WORDS: Record<string, Currency> = {
  usdt: "USDT",
  tether: "USDT",
  usd: "USD",
  dollar: "USD",
  dollor: "USD",
  доллар: "USD",
  eur: "EUR",
  euro: "EUR",
  yevro: "EUR",
  evro: "EUR",
  евро: "EUR",
  btc: "BTC",
  bitkoin: "BTC",
  bitcoin: "BTC",
  биткоин: "BTC",
};

/** amount — valyutaning eng kichik birligida (so'm, sent, satoshi) */
export type ParsedEntry = { amount: number; currency: Currency; note: string; type: "kirim" | "chiqim" | null };

export function parseQuickEntry(input: string): ParsedEntry | null {
  let text = input.trim();
  const sign = /^[+-]/.exec(text)?.[0];
  if (sign) text = text.slice(1).trimStart();

  let currency: Currency = "UZS";
  const prefix = PREFIX_SYMBOLS[text[0]];
  if (prefix) {
    currency = prefix;
    text = text.slice(1).trimStart();
  }

  const match = AMOUNT_RE.exec(text);
  if (!match) return null;
  const [whole, intPart, fraction, unitRaw] = match;
  let rest = text.slice(whole.length);

  const suffix = SUFFIX_RE.exec(rest);
  if (suffix) {
    // "so'm" yozilgan bo'lsa — so'm qoladi; oldida belgi bo'lsa ($20) — o'sha belgi ustun
    const found = suffix[1] ? PREFIX_SYMBOLS[suffix[1]] : SUFFIX_WORDS[suffix[2].toLowerCase()];
    if (found && !prefix) currency = found;
    rest = rest.slice(suffix[0].length);
  }

  const unit = unitRaw ? UNITS[unitRaw.toLowerCase()] : 1;
  const integer = intPart.replace(/[  ]/g, "");
  let value: number;
  if (currency === "UZS" && fraction && unit === 1 && fraction.length === 3) {
    // "45.000" — so'mda nuqta minglarni ajratgan
    value = Number(integer + fraction);
  } else {
    value = Number(`${integer}.${fraction ?? "0"}`) * unit;
  }
  const amount = toMinor(value, currency);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000_000) return null;

  const note = rest.trim().slice(0, 500);
  return { amount, currency, note, type: sign === "+" ? "kirim" : sign === "-" ? "chiqim" : null };
}

/** "Akmal 500000", "500000 Akmal", "Akmal aka 1.5 mln" → ism va summa */
export function parseNameAndAmount(input: string): { name: string; amount: number } | null {
  const text = input.trim();
  const first = parseQuickEntry(text);
  if (first && first.note) return { name: first.note.slice(0, 120), amount: first.amount };

  const match = /^(.*?\S)\s+(\d[\d\s\u00A0.,]*\s*(?:k|ming|mln|million|mlrd|m)?)\s*$/i.exec(text);
  if (!match) return null;
  const parsed = parseQuickEntry(match[2]);
  if (!parsed || parsed.note) return null;
  return { name: match[1].slice(0, 120), amount: parsed.amount };
}

const normalize = (s: string) => s.toLowerCase().replace(/[ʻ’`‘]/g, "'");

/** Izohdagi so'zlar bo'yicha kategoriyani topadi (kalit so'zlar yoki kategoriya nomi) */
export function guessCategory<T extends { name: string; keywords: string[] }>(note: string, categories: T[]) {
  const text = ` ${normalize(note)}`;
  if (!text.trim()) return null;
  return (
    categories.find((category) =>
      [category.name, ...category.keywords]
        .map(normalize)
        .filter(Boolean)
        .some((keyword) => text.includes(` ${keyword}`)),
    ) ?? null
  );
}

/** Telegram HTML uchun xavfsiz matn */
export function esc(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
