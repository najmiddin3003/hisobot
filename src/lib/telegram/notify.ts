import "server-only";
import { Api } from "grammy";
import { after } from "next/server";
import { dayKey, formatDate, formatDateTime } from "@/lib/dates";
import { calcDebt } from "@/lib/debts";
import { Debt, Transaction } from "@/lib/models";
import { formatMoney } from "@/lib/money";
import { esc } from "./parse";

/** Bot egasining chat ID'si (shaxsiy chatda u foydalanuvchi ID'si bilan bir xil) */
export function ownerChatId() {
  const id = Number(process.env.TELEGRAM_ALLOWED_USER_ID);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/** Egasiga xabar yuboradi. Bot sozlanmagan yoki Telegram javob bermasa — jim o'tadi */
export async function notifyOwner(html: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = ownerChatId();
  if (!token || !chatId) return false;
  try {
    await new Api(token).sendMessage(chatId, html, {
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
    });
    return true;
  } catch (error) {
    console.error("[telegram] xabar yuborilmadi:", error);
    return false;
  }
}

/** Javobni kutdirmaslik uchun xabarni so'rov tugagandan keyin yuboradi (Next.js tashqarisida — darhol) */
export function notifyOwnerLater(html: string) {
  try {
    after(() => notifyOwner(html));
  } catch {
    void notifyOwner(html);
  }
}

export function notifyNewWebLogin({ device, ip, closedPrevious }: { device: string; ip: string; closedPrevious: boolean }) {
  notifyOwnerLater(
    [
      "🔐 <b>Saytga kirildi</b>",
      `${esc(device)}${ip ? ` · IP ${esc(ip)}` : ""}`,
      formatDateTime(new Date()),
      closedPrevious ? "Oldingi seans yopildi." : "",
      "",
      "Bu siz bo'lmasangiz — darhol parolni o'zgartiring.",
    ]
      .filter((line, i, all) => line || all[i - 1])
      .join("\n"),
  );
}

/** amount — tayyor yozilgan summa (hamyon valyutasida) */
export function notifyRecurringAdded(items: { name: string; amount: string; type: "kirim" | "chiqim"; date: Date }[]) {
  if (items.length === 0) return;
  const lines = items.map(
    (i) => `${i.type === "kirim" ? "➕" : "➖"} ${esc(i.name)} — ${i.amount} (${formatDate(i.date)})`,
  );
  notifyOwnerLater(["🔁 <b>Takroriy to'lovlar yozildi</b>", ...lines].join("\n"));
}

/** Qaysi kunlarda eslatiladi: kreditda 1 kun oldin va o'sha kuni; qarzda 3 va 1 kun oldin, o'sha kuni, so'ng har hafta */
function shouldRemind(kind: "shaxs" | "kredit", days: number) {
  if (days < 0) return -days % 7 === 1;
  return kind === "kredit" ? days <= 1 : days === 3 || days <= 1;
}

/** Bugun eslatilishi kerak bo'lgan qarz va kreditlar: matn qatorlari va qarz ID'lari */
export async function collectDueReminders(now = new Date()) {
  const today = dayKey(now);
  const debts = await Debt.find({ deletedAt: null, status: "ochiq" });
  const payments = await Transaction.aggregate<{ _id: unknown; total: number }>([
    { $match: { debtId: { $in: debts.map((d) => d._id) }, debtRole: "tolov", deletedAt: null } },
    { $group: { _id: "$debtId", total: { $sum: "$amount" } } },
  ]);

  const lines: string[] = [];
  const reminded = [];
  for (const debt of debts) {
    if (debt.lastReminderDay === today) continue;
    const paid = payments.find((p) => debt._id.equals(String(p._id)))?.total ?? 0;
    const calc = calcDebt(debt, paid, now);
    if (!calc.nextDue || calc.daysToDue === null || calc.remaining === 0) continue;
    if (!shouldRemind(debt.kind, calc.daysToDue)) continue;

    const days = calc.daysToDue;
    const when = days === 0 ? "bugun" : days === 1 ? "ertaga" : days > 0 ? `${days} kundan keyin` : `${-days} kun o'tdi`;
    const name = esc(debt.counterparty);
    if (debt.kind === "kredit") {
      const amount = Math.min(debt.monthlyPayment ?? calc.remaining, calc.remaining);
      lines.push(`🏦 ${name}: kredit to'lovi ${when} — <b>${formatMoney(amount)}</b>`);
    } else if (debt.direction === "olingan") {
      lines.push(`↩️ ${name}ga qarzni qaytarish ${when} — <b>${formatMoney(calc.remaining)}</b>`);
    } else {
      lines.push(`↪️ ${name} qarzni qaytarishi ${when} — <b>${formatMoney(calc.remaining)}</b>`);
    }
    reminded.push(debt._id);
  }
  return { today, lines, debtIds: reminded };
}

/**
 * Qarz va kredit eslatmalari (har kuni ertalab cron chaqiradi). Bir kunda bir qarz uchun
 * bir martadan ko'p yuborilmaydi. Yuborilgan eslatmalar sonini qaytaradi.
 */
export async function sendDueReminders(now = new Date()) {
  const { today, lines, debtIds } = await collectDueReminders(now);
  if (lines.length === 0) return 0;
  const sent = await notifyOwner(["⏰ <b>Eslatma</b>", ...lines].join("\n"));
  if (sent) await Debt.updateMany({ _id: { $in: debtIds } }, { lastReminderDay: today });
  return sent ? lines.length : 0;
}
