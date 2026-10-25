import "server-only";
import bcrypt from "bcryptjs";
import { Bot, InlineKeyboard, type Context } from "grammy";
import type { UserFromGetMe } from "grammy/types";
import { isValidObjectId } from "mongoose";
import {
  clearFailedAttempts,
  lockedMessage,
  lockedMinutesLeft,
  registerFailedAttempt,
} from "@/lib/auth/attempts";
import { decrypt, randomToken } from "@/lib/auth/crypto";
import { verifyTotp } from "@/lib/auth/totp";
import { connectDB } from "@/lib/db";
import { calcDebt } from "@/lib/debts";
import { addPaymentRecord, saveDebtRecord } from "@/lib/debts-ops";
import { paidByPayments } from "@/lib/debts-sync";
import type { DebtDirection, RevokeReason } from "@/lib/domain";
import { BotState, Category, Debt, Transaction, User, Wallet } from "@/lib/models";
import { formatDateTime, monthRange, currentMonthKey } from "@/lib/dates";
import { CURRENCY_META, currencyOf, type Currency } from "@/lib/currency";
import { formatMoney } from "@/lib/money";
import { rateFor, transactionAmounts } from "@/lib/rates";
import { esc, guessCategory, parseNameAndAmount, parseQuickEntry } from "./parse";
import { buildReport, type ReportPeriod } from "./report";
import { endBotSession, readBotSession, startBotSession } from "./session";
import {
  MENU,
  confirmKeyboard,
  debtMenuKeyboard,
  entryKeyboard,
  mainMenu,
  pickerKeyboard,
  renderEntryDraft,
  reportKeyboard,
  type EntryDraft,
} from "./ui";

type Step =
  | "login_username"
  | "login_password"
  | "login_code"
  | "entry_amount"
  | "entry_confirm"
  | "debt_new_input"
  | "debt_new_confirm"
  | "debt_pay_amount"
  | "debt_pay_confirm";

type DebtNewDraft = { direction: DebtDirection; counterparty: string; amount: number; walletId: string | null; occurredAt: string };
type DebtPayDraft = { debtId: string; amount: number; walletId: string | null; occurredAt: string };

type State = { step: Step | null; data: Record<string, unknown>; lastWalletId: string | null };

const LOGIN_STEPS: (Step | null)[] = ["login_username", "login_password", "login_code"];
const HTML = { parse_mode: "HTML" } as const;

// ---- Holat (bazada saqlanadi — Vercel'da har xabar alohida so'rov) ----

async function loadState(chatId: number): Promise<State> {
  const doc = await BotState.findOne({ chatId }).lean();
  return { step: (doc?.step as Step | null) ?? null, data: (doc?.data as Record<string, unknown>) ?? {}, lastWalletId: doc?.lastWalletId ?? null };
}

async function saveState(chatId: number, step: Step | null, data: Record<string, unknown> = {}) {
  await BotState.updateOne({ chatId }, { $set: { step, data } }, { upsert: true });
}

async function rememberWallet(chatId: number, walletId: string) {
  await BotState.updateOne({ chatId }, { $set: { lastWalletId: walletId } }, { upsert: true });
}

async function loadOptions() {
  const [categories, wallets] = await Promise.all([
    Category.find({ archived: false }).sort({ order: 1, createdAt: 1 }).lean(),
    Wallet.find({ archived: false }).sort({ order: 1, createdAt: 1 }).lean(),
  ]);
  // Qarz va kreditlar faqat so'mda — ular uchun so'mli hamyonlar
  return { categories, wallets, uzsWallets: wallets.filter((w) => currencyOf(w) === "UZS") };
}
type Options = Awaited<ReturnType<typeof loadOptions>>;

/** Shu valyutadagi hamyonlar ($20 — dollar hamyonlari, 45000 — so'mli) */
const walletsFor = (options: Options, currency: Currency) => options.wallets.filter((w) => currencyOf(w) === currency);

/** Qo'lda tanlanadigan kategoriyalar (qarz/kredit tizim kategoriyalarisiz) */
const selectable = (options: Options, type: "kirim" | "chiqim") =>
  options.categories.filter((c) => c.type === type && (!c.systemKey || c.systemKey === "oylik"));

const defaultWalletId = (wallets: Options["wallets"], last: string | null) =>
  wallets.find((w) => w._id.equals(last ?? ""))?._id.toString() ?? wallets[0]?._id.toString() ?? null;

function revokedText(reason: RevokeReason | null) {
  switch (reason) {
    case "new_login":
      return "🔒 Botga boshqa joydan kirildi, bu seans yopildi.";
    case "password_changed":
      return "🔒 Parol o'zgartirildi — qaytadan kiring.";
    case "two_factor_reset":
      return "🔒 Google Authenticator qayta o'rnatildi — qaytadan kiring.";
    case "logout":
      return "👋 Tizimdan chiqqansiz.";
    default:
      return "🔒 Seans yopildi.";
  }
}

// ---- Kirish: login → parol → Google Authenticator kodi ----

let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= bcrypt.hash(randomToken(), 12));

async function handleLogin(ctx: Context, state: State, text: string, sessionNote: string) {
  const chatId = ctx.chat!.id;

  if (!LOGIN_STEPS.includes(state.step)) {
    await saveState(chatId, "login_username");
    await ctx.reply(`${sessionNote}\n\nKirish uchun <b>login</b>ingizni yozing:`, {
      ...HTML,
      reply_markup: { remove_keyboard: true },
    });
    return;
  }

  if (state.step === "login_username") {
    await saveState(chatId, "login_password", { username: text.trim().toLowerCase().slice(0, 64) });
    await ctx.reply("🔑 Parolni yozing. Xabar darhol o'chiriladi.");
    return;
  }

  if (state.step === "login_password") {
    // Parol chatda qolmasin
    await ctx.deleteMessage().catch(() => undefined);
    const user = await User.findOne({ username: String(state.data.username ?? "") });
    if (!user) {
      await bcrypt.compare(text, await getDummyHash());
      await saveState(chatId, "login_username");
      await ctx.reply("❌ Login yoki parol noto'g'ri. Loginni qaytadan yozing:");
      return;
    }
    const minutes = lockedMinutesLeft(user);
    if (minutes) {
      await saveState(chatId, null);
      await ctx.reply(`⛔ ${lockedMessage(minutes)}`);
      return;
    }
    if (!(await bcrypt.compare(text, user.passwordHash))) {
      const result = await registerFailedAttempt(user._id);
      await saveState(chatId, result.locked ? null : "login_username");
      await ctx.reply(result.locked ? `⛔ ${lockedMessage(15)}` : "❌ Login yoki parol noto'g'ri. Loginni qaytadan yozing:");
      return;
    }
    if (!user.totpEnabled || !user.totpSecret) {
      await saveState(chatId, null);
      await ctx.reply("Avval saytga kirib Google Authenticator'ni ulang, keyin botga qayting.");
      return;
    }
    await saveState(chatId, "login_code", { userId: String(user._id) });
    await ctx.reply("📱 Google Authenticator ilovasidagi 6 xonali kodni yozing:");
    return;
  }

  // login_code
  const user = isValidObjectId(state.data.userId) ? await User.findById(state.data.userId) : null;
  if (!user?.totpSecret) {
    await saveState(chatId, "login_username");
    await ctx.reply("Qaytadan boshlaymiz. Loginni yozing:");
    return;
  }
  const minutes = lockedMinutesLeft(user);
  if (minutes) {
    await saveState(chatId, null);
    await ctx.reply(`⛔ ${lockedMessage(minutes)}`);
    return;
  }
  const step = verifyTotp(decrypt(user.totpSecret), text.replace(/\s/g, ""), { lastUsedStep: user.totpLastStep });
  if (step === null) {
    const result = await registerFailedAttempt(user._id);
    if (result.locked) await saveState(chatId, null);
    await ctx.reply(result.locked ? `⛔ ${lockedMessage(15)}` : "❌ Kod noto'g'ri yoki eskirgan. Ilovadagi eng so'nggi kodni yozing:");
    return;
  }
  user.totpLastStep = step;
  await user.save();
  await clearFailedAttempts(user._id);
  await startBotSession(user._id, chatId);
  await saveState(chatId, null);
  await ctx.reply(
    [
      "✅ <b>Kirdingiz!</b> Seans 12 soat amal qiladi.",
      "",
      "Tez yozish: <code>45000 taksi</code> — chiqim",
      "Kirim: <code>+12000000 oylik</code>",
      "Valyutali hamyonga: <code>20$ taksi</code>, <code>15 eur</code>, <code>0.001 btc</code>",
      "Yoki pastdagi tugmalardan foydalaning.",
    ].join("\n"),
    { ...HTML, reply_markup: mainMenu() },
  );
}

// ---- Kirim / chiqim ----

async function startEntry(ctx: Context, type: "kirim" | "chiqim") {
  await saveState(ctx.chat!.id, "entry_amount", { type });
  await ctx.reply(
    type === "chiqim"
      ? "➖ Chiqim summasini yozing.\nMasalan: <code>45000 taksi</code> yoki <code>1.5 mln ijara</code>"
      : "➕ Kirim summasini yozing.\nMasalan: <code>12000000 oylik</code>",
    HTML,
  );
}

async function handleEntryInput(ctx: Context, state: State, fallbackType: "kirim" | "chiqim", text: string) {
  const parsed = parseQuickEntry(text);
  if (!parsed) {
    await ctx.reply("Summani tushunmadim 🤔\nMasalan: <code>45000 taksi</code>, <code>45k kofe</code>, <code>1.5 mln ijara</code>", HTML);
    return;
  }
  const options = await loadOptions();
  const wallets = walletsFor(options, parsed.currency);
  if (wallets.length === 0) {
    await ctx.reply(
      `Sizda ${CURRENCY_META[parsed.currency].symbol} hamyon yo'q 🤔
Saytda Sozlamalar → Hamyonlar bo'limida shu valyutada hamyon qo'shing.`,
      HTML,
    );
    return;
  }
  const type = parsed.type ?? fallbackType;
  const categories = selectable(options, type);
  const draft: EntryDraft = {
    type,
    amount: parsed.amount,
    currency: parsed.currency,
    note: parsed.note,
    categoryId: guessCategory(parsed.note, categories)?._id.toString() ?? null,
    walletId: defaultWalletId(wallets, state.lastWalletId),
    occurredAt: new Date().toISOString(),
  };

  // Kategoriya topilmasa — darhol tanlashni so'raymiz
  const message = draft.categoryId
    ? await ctx.reply(renderEntryDraft(draft, options.categories, options.wallets), { ...HTML, reply_markup: entryKeyboard() })
    : await ctx.reply(`${renderEntryDraft(draft, options.categories, options.wallets)}\n\n👇 Kategoriyani tanlang:`, {
        ...HTML,
        reply_markup: pickerKeyboard(categories, "e:cat", "e:back"),
      });
  await saveState(ctx.chat!.id, "entry_confirm", { draft, messageId: message.message_id });
}

async function handleEntryCallback(ctx: Context, state: State, action: string, value?: string) {
  const chatId = ctx.chat!.id;
  const draft = state.data.draft as EntryDraft | undefined;
  if (state.step !== "entry_confirm" || !draft) {
    await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => undefined);
    await ctx.answerCallbackQuery({ text: "Bu yozuv eskirgan — qaytadan kiriting" });
    return;
  }
  const options = await loadOptions();
  const render = (extra = "") => renderEntryDraft(draft, options.categories, options.wallets) + extra;

  if (action === "cancel") {
    await saveState(chatId, null);
    await ctx.editMessageText(`${render()}\n\n❌ Bekor qilindi`, HTML);
    return;
  }
  if (action === "cats") {
    await ctx.editMessageText(`${render()}\n\n👇 Kategoriyani tanlang:`, {
      ...HTML,
      reply_markup: pickerKeyboard(selectable(options, draft.type), "e:cat", "e:back"),
    });
    return;
  }
  if (action === "wals") {
    await ctx.editMessageText(`${render()}\n\n👇 Hamyonni tanlang:`, {
      ...HTML,
      reply_markup: pickerKeyboard(walletsFor(options, draft.currency ?? "UZS"), "e:wal", "e:back"),
    });
    return;
  }
  if (action === "cat" || action === "wal") {
    if (action === "cat") draft.categoryId = value ?? null;
    else draft.walletId = value ?? null;
    await saveState(chatId, "entry_confirm", { ...state.data, draft });
  }
  if (action === "save") {
    const category = selectable(options, draft.type).find((c) => c._id.equals(draft.categoryId ?? ""));
    const currency = draft.currency ?? "UZS";
    const wallet = walletsFor(options, currency).find((w) => w._id.equals(draft.walletId ?? ""));
    if (!category || !wallet) {
      await ctx.answerCallbackQuery({ text: "Kategoriya va hamyonni tanlang" });
      return;
    }
    // Chet valyutada — so'mdagi qiymati bugungi kurs bilan yoziladi
    const rate = await rateFor(currency);
    if (!rate.ok) {
      await ctx.answerCallbackQuery({ text: rate.error, show_alert: true });
      return;
    }
    await Transaction.create({
      type: draft.type,
      ...transactionAmounts(draft.amount, currency, rate.rate),
      categoryId: category._id,
      walletId: wallet._id,
      note: draft.note,
      occurredAt: new Date(draft.occurredAt),
      source: "telegram",
    });
    await rememberWallet(chatId, String(wallet._id));
    await saveState(chatId, null);

    const { start, end } = monthRange(currentMonthKey());
    const [monthTotal] = await Transaction.aggregate<{ total: number }>([
      { $match: { deletedAt: null, type: draft.type, occurredAt: { $gte: start, $lt: end } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    await ctx.editMessageText(
      `${render()}\n\n✅ <b>Saqlandi</b> · bu oy ${draft.type === "kirim" ? "kirim" : "chiqim"}: ${formatMoney(monthTotal?.total ?? 0)}`,
      HTML,
    );
    return;
  }
  // cat / wal / back → tasdiqlash ko'rinishiga qaytamiz
  await ctx.editMessageText(render(), { ...HTML, reply_markup: entryKeyboard() });
}

// ---- Qarzlar ----

const DEBT_TITLES: Record<DebtDirection, string> = { olingan: "📥 Qarz oldim", berilgan: "📤 Qarz berdim" };

async function startNewDebt(ctx: Context, direction: DebtDirection) {
  await saveState(ctx.chat!.id, "debt_new_input", { direction });
  await ctx.editMessageText(
    `${DEBT_TITLES[direction]}\n\n${direction === "olingan" ? "Kimdan" : "Kimga"} va qancha? Masalan: <code>${direction === "olingan" ? "Akmal 500000" : "Sardor 300 000"}</code>`,
    HTML,
  );
}

function renderDebtDraft(draft: DebtNewDraft, options: Options) {
  const wallet = options.wallets.find((w) => w._id.equals(draft.walletId ?? ""))?.name ?? "tanlanmagan";
  return [
    `<b>${DEBT_TITLES[draft.direction]}</b>`,
    `👤 ${esc(draft.counterparty)}`,
    `💰 ${formatMoney(draft.amount)}`,
    `👛 ${esc(wallet)} — ${draft.direction === "olingan" ? "pul shu hamyonga tushdi" : "pul shu hamyondan berildi"}`,
    `🕐 ${formatDateTime(new Date(draft.occurredAt))}`,
  ].join("\n");
}

async function handleNewDebtInput(ctx: Context, state: State, text: string) {
  const parsed = parseNameAndAmount(text);
  if (!parsed) {
    await ctx.reply("Ism va summani so'mda yozing (qarzlar so'mda yuritiladi), masalan: <code>Akmal 500000</code>", HTML);
    return;
  }
  const options = await loadOptions();
  const draft: DebtNewDraft = {
    direction: state.data.direction as DebtDirection,
    counterparty: parsed.name,
    amount: parsed.amount,
    walletId: defaultWalletId(options.uzsWallets, state.lastWalletId),
    occurredAt: new Date().toISOString(),
  };
  await ctx.reply(renderDebtDraft(draft, options), { ...HTML, reply_markup: confirmKeyboard("d") });
  await saveState(ctx.chat!.id, "debt_new_confirm", { draft });
}

async function listDebtsForPayment(ctx: Context, target: DebtDirection | "kredit") {
  const filter =
    target === "kredit"
      ? ({ direction: "olingan", kind: "kredit" } as const)
      : ({ direction: target, kind: "shaxs" } as const);
  const debts = await Debt.find({ ...filter, deletedAt: null, status: "ochiq" }).sort({ startedAt: 1 });
  const items = [];
  for (const debt of debts) {
    const { remaining } = calcDebt(debt, await paidByPayments(debt._id));
    if (remaining > 0) items.push({ _id: debt._id, name: `${debt.counterparty} — ${formatMoney(remaining)}` });
  }
  const title =
    target === "kredit" ? "🏦 Qaysi kredit?" : target === "olingan" ? "↩️ Kimga qaytardingiz?" : "↪️ Kim qaytardi?";
  if (items.length === 0) {
    await ctx.editMessageText(`${title}\n\nOchiq ${target === "kredit" ? "kredit" : "qarz"} yo'q.`);
    return;
  }
  await ctx.editMessageText(title, { reply_markup: pickerKeyboard(items, "d:pick", "d:menu") });
}

async function pickDebtForPayment(ctx: Context, debtId: string) {
  const debt = isValidObjectId(debtId) ? await Debt.findOne({ _id: debtId, deletedAt: null, status: "ochiq" }) : null;
  if (!debt) {
    await ctx.answerCallbackQuery({ text: "Qarz topilmadi" });
    return;
  }
  const { remaining } = calcDebt(debt, await paidByPayments(debt._id));
  await saveState(ctx.chat!.id, "debt_pay_amount", { debtId });
  const keyboard = new InlineKeyboard();
  if (debt.kind === "kredit" && debt.monthlyPayment && debt.monthlyPayment < remaining) {
    keyboard.text(`Oylik: ${formatMoney(debt.monthlyPayment)}`, `d:amt:${debt.monthlyPayment}`).row();
  }
  keyboard.text(`Hammasi: ${formatMoney(remaining)}`, `d:amt:${remaining}`).row().text("⬅️ Orqaga", "d:menu");
  await ctx.editMessageText(
    `<b>${esc(debt.counterparty)}</b> — qolgan: ${formatMoney(remaining)}\n\nQancha? Summani yozing yoki tugmani bosing:`,
    { ...HTML, reply_markup: keyboard },
  );
}

async function showPaymentDraft(ctx: Context, state: State, amount: number, edit: boolean) {
  const debtId = String(state.data.debtId ?? "");
  const debt = isValidObjectId(debtId) ? await Debt.findById(debtId) : null;
  if (!debt) {
    await saveState(ctx.chat!.id, null);
    await ctx.reply("Qarz topilmadi.");
    return;
  }
  const options = await loadOptions();
  const draft: DebtPayDraft = {
    debtId,
    amount,
    walletId: defaultWalletId(options.uzsWallets, state.lastWalletId),
    occurredAt: new Date().toISOString(),
  };
  const text = renderPaymentDraft(debt, draft, options);
  if (edit) await ctx.editMessageText(text, { ...HTML, reply_markup: confirmKeyboard("d") });
  else await ctx.reply(text, { ...HTML, reply_markup: confirmKeyboard("d") });
  await saveState(ctx.chat!.id, "debt_pay_confirm", { draft });
}

type DebtLabel = { counterparty: string; direction: DebtDirection; kind: "shaxs" | "kredit" };

function renderPaymentDraft(debt: DebtLabel | null, draft: DebtPayDraft, options: Options) {
  const wallet = options.wallets.find((w) => w._id.equals(draft.walletId ?? ""))?.name ?? "tanlanmagan";
  const title =
    debt?.kind === "kredit" ? "🏦 Kredit to'lovi" : debt?.direction === "berilgan" ? "↪️ Qarz qaytarildi" : "↩️ Qarzni qaytarish";
  return [
    `<b>${title}</b>`,
    `👤 ${esc(debt?.counterparty ?? "—")}`,
    `💰 ${formatMoney(draft.amount)}`,
    `👛 ${esc(wallet)}`,
    `🕐 ${formatDateTime(new Date(draft.occurredAt))}`,
  ].join("\n");
}

async function handleDebtCallback(ctx: Context, state: State, action: string, value?: string) {
  const chatId = ctx.chat!.id;
  switch (action) {
    case "menu":
      await saveState(chatId, null);
      await ctx.editMessageText("🤝 Qarz — nima qilamiz?", { reply_markup: debtMenuKeyboard() });
      return;
    case "new":
      await startNewDebt(ctx, value === "berilgan" ? "berilgan" : "olingan");
      return;
    case "list":
      await listDebtsForPayment(ctx, value === "berilgan" ? "berilgan" : value === "kredit" ? "kredit" : "olingan");
      return;
    case "pick":
      await pickDebtForPayment(ctx, value ?? "");
      return;
    case "amt":
      if (state.step !== "debt_pay_amount") break;
      await showPaymentDraft(ctx, state, Number(value), true);
      return;
  }

  const newDraft = state.step === "debt_new_confirm" ? (state.data.draft as DebtNewDraft) : null;
  const payDraft = state.step === "debt_pay_confirm" ? (state.data.draft as DebtPayDraft) : null;
  if (!newDraft && !payDraft) {
    await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => undefined);
    await ctx.answerCallbackQuery({ text: "Bu amal eskirgan — qaytadan boshlang" });
    return;
  }
  const options = await loadOptions();
  const debt = payDraft ? await Debt.findById(payDraft.debtId) : null;
  const render = () =>
    newDraft
      ? renderDebtDraft(newDraft, options)
      : renderPaymentDraft(debt, payDraft!, options);

  if (action === "cancel") {
    await saveState(chatId, null);
    await ctx.editMessageText(`${render()}\n\n❌ Bekor qilindi`, HTML);
    return;
  }
  if (action === "wals") {
    await ctx.editMessageText(`${render()}\n\n👇 Hamyonni tanlang:`, {
      ...HTML,
      reply_markup: pickerKeyboard(options.uzsWallets, "d:wal", "d:back"),
    });
    return;
  }
  if (action === "wal") {
    (newDraft ?? payDraft)!.walletId = value ?? null;
    await saveState(chatId, state.step, { draft: newDraft ?? payDraft });
  }
  if (action === "save") {
    const walletId = (newDraft ?? payDraft)!.walletId ?? "";
    const result = newDraft
      ? await saveDebtRecord({
          direction: newDraft.direction,
          kind: "shaxs",
          recordEntry: true,
          walletId,
          source: "telegram",
          fields: {
            counterparty: newDraft.counterparty,
            amount: newDraft.amount,
            startedAt: new Date(newDraft.occurredAt),
            dueDate: null,
            monthlyPayment: null,
            paymentDay: null,
            termMonths: null,
            paidBefore: 0,
            note: "",
          },
        })
      : await addPaymentRecord({
          debtId: payDraft!.debtId,
          amount: payDraft!.amount,
          walletId,
          occurredAt: new Date(payDraft!.occurredAt),
          note: "",
          source: "telegram",
        });
    if (!result.ok) {
      await ctx.answerCallbackQuery({ text: result.error, show_alert: true });
      return;
    }
    await rememberWallet(chatId, walletId);
    await saveState(chatId, null);

    let footer = "✅ <b>Saqlandi</b>";
    if (result.debtId) {
      const saved = await Debt.findById(result.debtId);
      if (saved) {
        const { remaining } = calcDebt(saved, await paidByPayments(saved._id));
        footer += remaining > 0 ? ` · qolgan: ${formatMoney(remaining)}` : " · qarz to'liq yopildi 🎉";
      }
    }
    await ctx.editMessageText(`${render()}\n\n${footer}\nMuddat va izohni saytda qo'shish mumkin.`, HTML);
    return;
  }
  // wal / back → tasdiqlash ko'rinishiga qaytamiz
  await ctx.editMessageText(render(), { ...HTML, reply_markup: confirmKeyboard("d") });
}

// ---- Hisobot ----

async function sendReport(ctx: Context, period: ReportPeriod, edit: boolean) {
  const text = await buildReport(period);
  if (edit) await ctx.editMessageText(text, { ...HTML, reply_markup: reportKeyboard(period) }).catch(() => undefined);
  else await ctx.reply(text, { ...HTML, reply_markup: reportKeyboard(period) });
}

// ---- Bot ----

async function onText(ctx: Context) {
  const chatId = ctx.chat!.id;
  const text = ctx.message!.text!.trim();
  const state = await loadState(chatId);
  const session = await readBotSession(chatId);

  if (session.status !== "ok") {
    const note =
      session.status === "expired"
        ? "⏰ Seans muddati (12 soat) tugadi."
        : session.status === "revoked"
          ? revokedText(session.reason)
          : "👋 Salom! Bu — shaxsiy moliya boti.";
    await handleLogin(ctx, state, text, note);
    return;
  }

  switch (text) {
    case "/start":
    case "/menu":
      await saveState(chatId, null);
      await ctx.reply("Menyu 👇", { reply_markup: mainMenu() });
      return;
    case MENU.expense:
      await startEntry(ctx, "chiqim");
      return;
    case MENU.income:
      await startEntry(ctx, "kirim");
      return;
    case MENU.debt:
      await saveState(chatId, null);
      await ctx.reply("🤝 Qarz — nima qilamiz?", { reply_markup: debtMenuKeyboard() });
      return;
    case MENU.report:
      await saveState(chatId, null);
      await sendReport(ctx, "oy", false);
      return;
    case MENU.logout:
    case "/logout":
      await endBotSession(chatId, "logout");
      await saveState(chatId, null);
      await ctx.reply("👋 Chiqdingiz. Qayta kirish uchun istalgan xabar yozing.", {
        reply_markup: { remove_keyboard: true },
      });
      return;
  }

  if (state.step === "entry_amount") {
    await handleEntryInput(ctx, state, state.data.type === "kirim" ? "kirim" : "chiqim", text);
    return;
  }
  if (state.step === "debt_new_input") {
    await handleNewDebtInput(ctx, state, text);
    return;
  }
  if (state.step === "debt_pay_amount") {
    const parsed = parseQuickEntry(text);
    // Qarzlar so'mda yuritiladi
    if (!parsed || parsed.currency !== "UZS") {
      await ctx.reply("Summani raqam bilan yozing, masalan: <code>500000</code>", HTML);
      return;
    }
    await showPaymentDraft(ctx, state, parsed.amount, false);
    return;
  }

  // Hech qanday qadam kutilmayapti: "45000 taksi" — tezkor chiqim, "+500000 ..." — kirim
  if (parseQuickEntry(text)) {
    await handleEntryInput(ctx, state, "chiqim", text);
    return;
  }
  await ctx.reply(
    "Tushunmadim 🤔\nChiqim yozish: <code>45000 taksi</code>\nKirim: <code>+12000000 oylik</code>\nYoki menyudan tanlang 👇",
    { ...HTML, reply_markup: mainMenu() },
  );
}

async function onCallback(ctx: Context) {
  const chatId = ctx.chat!.id;
  const session = await readBotSession(chatId);
  if (session.status !== "ok") {
    await ctx.answerCallbackQuery({ text: "Seans tugagan — qaytadan kiring" });
    await saveState(chatId, "login_username");
    await ctx.reply("🔒 Seans tugagan. Kirish uchun <b>login</b>ingizni yozing:", {
      ...HTML,
      reply_markup: { remove_keyboard: true },
    });
    return;
  }

  const [scope, action, value] = ctx.callbackQuery!.data!.split(":");
  const state = await loadState(chatId);
  if (scope === "e") await handleEntryCallback(ctx, state, action, value);
  else if (scope === "d") await handleDebtCallback(ctx, state, action, value);
  else if (scope === "r") await sendReport(ctx, action as ReportPeriod, true);
  await ctx.answerCallbackQuery().catch(() => undefined);
}

export function createBot(options: { botInfo?: UserFromGetMe } = {}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN .env.local faylida ko'rsatilmagan");
  const bot = new Bot(token, { botInfo: options.botInfo });

  // Faqat egasi va faqat shaxsiy chat. Begonalarga umuman javob berilmaydi
  bot.use(async (ctx, next) => {
    const owner = Number(process.env.TELEGRAM_ALLOWED_USER_ID);
    if (!owner || ctx.from?.id !== owner || ctx.chat?.type !== "private") return;
    await connectDB();
    await next();
  });

  bot.on("message:text", onText);
  bot.on("callback_query:data", onCallback);
  bot.on("message", (ctx) => ctx.reply("Faqat matnli xabarlar qabul qilinadi. Masalan: <code>45000 taksi</code>", HTML));
  bot.catch((error) => console.error("[bot] xatolik:", error.error));
  return bot;
}

let instance: Bot | null = null;

/** Webhook va polling uchun yagona bot nusxasi */
export function getBot() {
  return (instance ??= createBot());
}
