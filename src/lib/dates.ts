// Barcha sanalar UTC'da saqlanadi va Toshkent vaqtida ko'rsatiladi.
// Toshkent doim UTC+5 (yozgi vaqt yo'q), shuning uchun siljish o'zgarmas.

export const TIME_ZONE = "Asia/Tashkent";
const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;

export const MONTH_NAMES = [
  "Yanvar",
  "Fevral",
  "Mart",
  "Aprel",
  "May",
  "Iyun",
  "Iyul",
  "Avgust",
  "Sentabr",
  "Oktabr",
  "Noyabr",
  "Dekabr",
] as const;

export const WEEKDAY_NAMES = [
  "yakshanba",
  "dushanba",
  "seshanba",
  "chorshanba",
  "payshanba",
  "juma",
  "shanba",
] as const;

function tashkentParts(date: Date) {
  const t = new Date(date.getTime() + TASHKENT_OFFSET_MS);
  return {
    year: t.getUTCFullYear(),
    month: t.getUTCMonth() + 1,
    day: t.getUTCDate(),
    weekday: t.getUTCDay(),
    hour: t.getUTCHours(),
    minute: t.getUTCMinutes(),
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "22 oktabr 2026" */
export function formatDate(date: Date) {
  const p = tashkentParts(date);
  return `${p.day} ${MONTH_NAMES[p.month - 1].toLowerCase()} ${p.year}`;
}

/** "14:35" */
export function formatTime(date: Date) {
  const p = tashkentParts(date);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

/** "22 oktabr 2026, 14:35" */
export function formatDateTime(date: Date) {
  return `${formatDate(date)}, ${formatTime(date)}`;
}

/** Toshkent vaqti bo'yicha kun: "2026-10-22" (yozuvlarni kunlar bo'yicha guruhlash uchun) */
export function dayKey(date: Date) {
  const p = tashkentParts(date);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Kun sarlavhasi: "Bugun", "Kecha" yoki "20 oktabr, seshanba" (boshqa yil bo'lsa yili bilan) */
export function formatDayHeading(key: string, now = new Date()) {
  const [year, month, day] = key.split("-").map(Number);
  const today = dayKey(now);
  if (key === today) return "Bugun";
  if (key === dayKey(new Date(now.getTime() - 24 * 60 * 60 * 1000))) return "Kecha";
  const weekday = WEEKDAY_NAMES[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  const yearPart = String(year) === today.slice(0, 4) ? "" : ` ${year}`;
  return `${day} ${MONTH_NAMES[month - 1].toLowerCase()}${yearPart}, ${weekday}`;
}

/** Toshkent vaqtidagi aniq lahza */
export function tashkentDate(year: number, month: number, day: number, hour = 0, minute = 0) {
  return new Date(Date.UTC(year, month - 1, day, hour, minute) - TASHKENT_OFFSET_MS);
}

/** <input type="datetime-local"> uchun: "2026-10-22T14:35" (Toshkent vaqti) */
export function toDateTimeInput(date: Date) {
  const p = tashkentParts(date);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/** "2026-10-22T14:35" (Toshkent vaqti) → Date; noto'g'ri bo'lsa null */
export function fromDateTimeInput(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) return null;
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  const date = tashkentDate(year, month, day, hour, minute);
  // 31-fevral kabi mavjud bo'lmagan sanalarni rad etish
  return toDateTimeInput(date).startsWith(value.slice(0, 16)) ? date : null;
}

/** Toshkent vaqti bo'yicha bugungi sana qismlari */
export function tashkentToday(now = new Date()) {
  const { year, month, day } = tashkentParts(now);
  return { year, month, day };
}

// ---- Oylar ("YYYY-MM" kalitlari) ----

const MONTH_KEY_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function isMonthKey(value: unknown): value is string {
  return typeof value === "string" && MONTH_KEY_RE.test(value);
}

function parseMonthKey(key: string) {
  const match = MONTH_KEY_RE.exec(key);
  if (!match) throw new Error(`Noto'g'ri oy kaliti: ${key}`);
  return { year: Number(match[1]), month: Number(match[2]) };
}

export function toMonthKey(year: number, month: number) {
  return `${year}-${pad(month)}`;
}

export function currentMonthKey(now = new Date()) {
  const p = tashkentParts(now);
  return toMonthKey(p.year, p.month);
}

/** URL'dagi ?oy= qiymati: to'g'ri va kelajakda bo'lmasa o'zi, aks holda joriy oy */
export function resolveMonthParam(raw: unknown, now = new Date()) {
  const current = currentMonthKey(now);
  return isMonthKey(raw) && raw <= current ? raw : current;
}

export function shiftMonth(key: string, delta: number) {
  const { year, month } = parseMonthKey(key);
  const index = year * 12 + (month - 1) + delta;
  return toMonthKey(Math.floor(index / 12), (index % 12) + 1);
}

/** Oyning Toshkent vaqti bo'yicha boshlanishi va tugashi (end — keyingi oyning boshi, kirmaydi) */
export function monthRange(key: string) {
  const { year, month } = parseMonthKey(key);
  return {
    start: new Date(Date.UTC(year, month - 1, 1) - TASHKENT_OFFSET_MS),
    end: new Date(Date.UTC(year, month, 1) - TASHKENT_OFFSET_MS),
  };
}

export function daysInMonth(key: string) {
  const { year, month } = parseMonthKey(key);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function monthParts(key: string) {
  return parseMonthKey(key);
}

/** "Oktabr 2026" */
export function monthLabel(key: string) {
  const { year, month } = parseMonthKey(key);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}
