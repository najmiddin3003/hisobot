import "server-only";
import {
  currentMonthKey,
  daysInMonth,
  monthParts,
  shiftMonth,
  tashkentDate,
  tashkentToday,
} from "@/lib/dates";
import { Recurring, Transaction } from "@/lib/models";

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
  const items = await Recurring.find({
    active: true,
    $or: [{ lastGeneratedMonth: null }, { lastGeneratedMonth: { $lt: current } }],
  }).lean();

  let created = 0;
  for (const item of items) {
    let last = item.lastGeneratedMonth;
    for (let i = 0; i < 12; i++) {
      const month = shiftMonth(last ?? shiftMonth(current, -1), 1);
      if (month > current) break;
      const day = dueDay(item.dayOfMonth, month);
      if (month === current && today < day) break;

      const claim = await Recurring.updateOne(
        { _id: item._id, active: true, lastGeneratedMonth: last },
        { lastGeneratedMonth: month },
      );
      if (claim.modifiedCount !== 1) break; // boshqa so'rov allaqachon yozgan

      const { year, month: m } = monthParts(month);
      const occurredAt = tashkentDate(year, m, day, 9);
      await Transaction.create({
        type: item.type,
        amount: item.amount,
        categoryId: item.categoryId,
        walletId: item.walletId,
        note: item.note ? `${item.name} — ${item.note}` : item.name,
        occurredAt: occurredAt > now ? now : occurredAt,
        source: "auto",
        recurringId: item._id,
      });
      last = month;
      created++;
    }
  }
  return created;
}
