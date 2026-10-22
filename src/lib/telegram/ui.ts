import { InlineKeyboard, Keyboard } from "grammy";
import type { Types } from "mongoose";
import { formatDateTime } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { esc } from "./parse";

export const MENU = {
  expense: "➖ Chiqim",
  income: "➕ Kirim",
  debt: "🤝 Qarz",
  report: "📊 Hisobot",
  logout: "🚪 Chiqish",
} as const;

export const mainMenu = () =>
  new Keyboard()
    .text(MENU.expense)
    .text(MENU.income)
    .row()
    .text(MENU.debt)
    .text(MENU.report)
    .row()
    .text(MENU.logout)
    .resized()
    .persistent();

type Named = { _id: Types.ObjectId; name: string };

export type EntryDraft = {
  type: "kirim" | "chiqim";
  amount: number;
  note: string;
  categoryId: string | null;
  walletId: string | null;
  occurredAt: string;
};

const nameOf = (items: Named[], id: string | null) => items.find((i) => i._id.equals(id ?? ""))?.name;

export function renderEntryDraft(draft: EntryDraft, categories: Named[], wallets: Named[], title?: string) {
  const isIncome = draft.type === "kirim";
  return [
    title ?? `${isIncome ? "➕" : "➖"} <b>${isIncome ? "Kirim" : "Chiqim"}: ${formatMoney(draft.amount)}</b>`,
    `🏷 ${esc(nameOf(categories, draft.categoryId) ?? "Kategoriya tanlanmagan")}`,
    `👛 ${esc(nameOf(wallets, draft.walletId) ?? "Hamyon tanlanmagan")}`,
    draft.note ? `📝 ${esc(draft.note)}` : "",
    `🕐 ${formatDateTime(new Date(draft.occurredAt))}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export const entryKeyboard = () =>
  new InlineKeyboard()
    .text("✅ Saqlash", "e:save")
    .row()
    .text("🏷 Kategoriya", "e:cats")
    .text("👛 Hamyon", "e:wals")
    .row()
    .text("❌ Bekor qilish", "e:cancel");

/** Ikkitadan qatorga teriladigan tanlov tugmalari */
export function pickerKeyboard(items: Named[], prefix: string, back: string) {
  const keyboard = new InlineKeyboard();
  items.forEach((item, index) => {
    keyboard.text(item.name, `${prefix}:${item._id}`);
    if (index % 2 === 1) keyboard.row();
  });
  return keyboard.row().text("⬅️ Orqaga", back);
}

export const debtMenuKeyboard = () =>
  new InlineKeyboard()
    .text("📥 Qarz oldim", "d:new:olingan")
    .text("📤 Qarz berdim", "d:new:berilgan")
    .row()
    .text("↩️ Qarzimni qaytardim", "d:list:olingan")
    .row()
    .text("↪️ Menga qaytarishdi", "d:list:berilgan")
    .row()
    .text("🏦 Kredit to'lovi", "d:list:kredit");

export const confirmKeyboard = (prefix: "d") =>
  new InlineKeyboard()
    .text("✅ Saqlash", `${prefix}:save`)
    .row()
    .text("👛 Hamyon", `${prefix}:wals`)
    .text("❌ Bekor qilish", `${prefix}:cancel`);

export const reportKeyboard = (active: "bugun" | "hafta" | "oy") =>
  new InlineKeyboard()
    .text(active === "bugun" ? "• Bugun" : "Bugun", "r:bugun")
    .text(active === "hafta" ? "• Bu hafta" : "Bu hafta", "r:hafta")
    .text(active === "oy" ? "• Bu oy" : "Bu oy", "r:oy");
