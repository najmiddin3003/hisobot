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
const AMOUNT_RE = /^([+-])?\s*(\d{1,3}(?:[ \u00A0]\d{3})+|\d+)(?:[.,](\d+))?\s*(k|ming|mln|million|mlrd|m)?(?=\s|$)/i;

export type ParsedEntry = { amount: number; note: string; type: "kirim" | "chiqim" | null };

export function parseQuickEntry(input: string): ParsedEntry | null {
  const text = input.trim();
  const match = AMOUNT_RE.exec(text);
  if (!match) return null;
  const [whole, sign, intPart, fraction, unitRaw] = match;
  const unit = unitRaw ? UNITS[unitRaw.toLowerCase()] : 1;

  const integer = intPart.replace(/[ \u00A0]/g, "");
  let amount: number;
  if (fraction && unit === 1 && fraction.length === 3) {
    // "45.000" — nuqta minglarni ajratgan
    amount = Number(integer + fraction);
  } else {
    amount = Number(`${integer}.${fraction ?? "0"}`) * unit;
  }
  amount = Math.round(amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000_000) return null;

  const note = text
    .slice(whole.length)
    .replace(/^\s*(so['ʻ’`]?m|sum|сум)\b/i, "")
    .trim()
    .slice(0, 500);
  return { amount, note, type: sign === "+" ? "kirim" : sign === "-" ? "chiqim" : null };
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
