import "server-only";
import {
  currentMonthKey,
  daysInMonth,
  monthParts,
  monthRange,
  shiftMonth,
  tashkentDate,
  tashkentToday,
} from "@/lib/dates";
import { currencyOf, formatCurrency } from "@/lib/currency";
import { Recurring, Transaction, Wallet } from "@/lib/models";
import { getRates, transactionAmounts } from "@/lib/rates";
import { notifyRecurringAdded } from "@/lib/telegram/notify";

/** Shu oyda to'lov kuni (oy qisqa bo'lsa — oxirgi kuni) */
function dueDay(dayOfMonth: number, month: string) {
  return Math.min(dayOfMonth, daysInMonth(month));
}

/**
 * Yangi (yoki qayta yoqilgan) takroriy to'lov uchun boshlang'ich holat.
 * To'lov kuni bu oyda o'tib ketgan bo'lsa, bu oy uchun yozilmaydi (ehtimol qo'lda kiritilgan) —
 * birinchi yozuv keyingi oyda paydo bo'ladi.
 */
export function initialLastGeneratedMonth(dayOfMonth: number, now = new Date()) {
  const current = currentMonthKey(now);
  return tashkentToday(now).day > dueDay(dayOfMonth, current) ? current : shiftMonth(current, -1);
}

export function nextRecurringDate(item: { dayOfMonth: number; lastGeneratedMonth?: string | null }, now = new Date()) {
  const month = shiftMonth(item.lastGeneratedMonth ?? shiftMonth(currentMonthKey(now), -1), 1);
  const { year, month: m } = monthParts(month);
  return tashkentDate(year, m, dueDay(item.dayOfMonth, month), 9);
}

/**
 * Vaqti kelgan takroriy to'lovlarni kirim-chiqimga yozadi (o'tkazib yuborilgan oylar ham, ko'pi bilan 12 ta).
 * Bir necha marta chaqirilsa ham ikki marta yozmaydi: har bir oy avval "band qilinadi".
 */
export async function generateDueRecurring(now = new Date()) {
  const current = currentMonthKey(now);
  const today = tashkentToday(now).day;
  // Keyingi tekshiruv qachon kerak: eng kechi — kelasi oy boshi
  let nextDueAt = monthRange(shiftMonth(current, 1)).start.getTime();
  const items = await Recurring.find({
    active: true,
    $or: [{ lastGeneratedMonth: null }, { lastGeneratedMonth: { $lt: current } }],
  }).lean();
  if (items.length === 0) {
    schedule = { checkedAt: now.getTime(), nextDueAt };
    return 0;
  }

  // Takroriy to'lov summasi hamyon valyutasida — so'mga yozilgan paytdagi kurs bilan aylantiriladi
  const [wallets, { rates }] = await Promise.all([
    Wallet.find({ _id: { $in: items.map((i) => i.walletId) } }, { currency: 1 }).lean(),
    getRates(),
  ]);

  const created: { name: string; amount: string; type: "kirim" | "chiqim"; date: Date }[] = [];
  for (const item of items) {
    const currency = currencyOf(wallets.find((w) => w._id.equals(item.walletId)));
    // Kurs hali olinmagan bo'lsa — keyingi safar (kurs kelganda) yoziladi
    if (!rates[currency]) {
      nextDueAt = now.getTime();
      continue;
    }
    let last = item.lastGeneratedMonth;
    for (let i = 0; i < 12; i++) {
      const month = shiftMonth(last ?? shiftMonth(current, -1), 1);
      if (month > current) break;
      const day = dueDay(item.dayOfMonth, month);
      const { year, month: m } = monthParts(month);
      if (month === current && today < day) {
        // To'lov kuni boshlanishi bilan (Toshkent vaqti) yana tekshiriladi
        nextDueAt = Math.min(nextDueAt, tashkentDate(year, m, day).getTime());
        break;
      }

      const claim = await Recurring.updateOne(
        { _id: item._id, active: true, lastGeneratedMonth: last },
        { lastGeneratedMonth: month },
      );
      if (claim.modifiedCount !== 1) break; // boshqa so'rov allaqachon yozgan

      const date = tashkentDate(year, m, day, 9);
      const occurredAt = date > now ? now : date;
      await Transaction.create({
        type: item.type,
        ...transactionAmounts(item.amount, currency, rates[currency]),
        categoryId: item.categoryId,
        walletId: item.walletId,
        note: item.note ? `${item.name} — ${item.note}` : item.name,
        occurredAt,
        source: "auto",
        recurringId: item._id,
      });
      last = month;
      created.push({ name: item.name, amount: formatCurrency(item.amount, currency), type: item.type, date: occurredAt });
    }
  }
  // Telegram'da xabar beriladi (bot sozlangan bo'lsa)
  notifyRecurringAdded(created);
  schedule = { checkedAt: now.getTime(), nextDueAt };
  return created.length;
}

// Shu server nusxasi xotirasida: keyingi takroriy to'lov qachon vaqti keladi. Undan oldin sahifalar bazaga bormaydi.
// Boshqa nusxada o'zgargan bo'lishi mumkinligi uchun baribir har 10 daqiqada qayta tekshiriladi.
const SCHEDULE_TTL_MS = 10 * 60 * 1000;
let schedule: { checkedAt: number; nextDueAt: number } | null = null;
let pending: Promise<number> | null = null;

/** Takroriy to'lov qo'shilsa/o'zgarsa/yoqilsa — keyingi sahifa ochilishida darhol tekshirilsin */
export function invalidateRecurringSchedule() {
  schedule = null;
}

/** Sahifalar uchun: faqat biror to'lov vaqti kelgan bo'lishi mumkin bo'lsa bazaga boradi (bir vaqtdagi chaqiruvlar birlashadi) */
export async function ensureDueRecurring() {
  const now = Date.now();
  if (schedule && now < schedule.nextDueAt && now - schedule.checkedAt < SCHEDULE_TTL_MS) return 0;
  pending ??= generateDueRecurring().finally(() => {
    pending = null;
  });
  return pending;
}
