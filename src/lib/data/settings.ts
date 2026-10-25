import "server-only";
import type { Types } from "mongoose";
import { AI_MODEL, aiConfigured } from "@/lib/ai/client";
import { requireUser } from "@/lib/auth/dal";
import { balanceOf, sumsByWallet } from "@/lib/balances";
import { currencyOf, minorToUzs } from "@/lib/currency";
import { connectDB } from "@/lib/db";
import { AiChat, AiInsight, Category, Recurring, Transaction, Transfer, User, Wallet } from "@/lib/models";
import { getRates } from "@/lib/rates";

export type SettingsOverview = Awaited<ReturnType<typeof getSettingsOverview>>;
export type CategoryItem = SettingsOverview["categories"][number];
export type WalletItem = SettingsOverview["wallets"][number];

type UsageRow = { _id: Types.ObjectId; total: number; active: number };

/** Nechta yozuvda ishlatilgan: total — savatchadagilar bilan (o'chirish mumkinligini tekshirish uchun), active — ko'rinadiganlari */
const usageBy = (field: string, model: typeof Transaction | typeof Transfer = Transaction) =>
  (model as typeof Transaction).aggregate<UsageRow>([
    {
      $group: {
        _id: `$${field}`,
        total: { $sum: 1 },
        active: { $sum: { $cond: [{ $eq: ["$deletedAt", null] }, 1, 0] } },
      },
    },
  ]);

/** Sozlamalar sahifasi: kategoriyalar, hamyonlar (yashirilganlari ham), AI, bot va takroriy to'lovlar holati */
export async function getSettingsOverview() {
  // Seans cookie'si o'qilgani uchun baza har doim so'rov paytida o'qiladi (build vaqtida emas)
  await requireUser();
  await connectDB();

  const [wallets, categories, userCount, sums, byCategory, byWallet, transfersFrom, transfersTo, recurring, chats, insights, { rates }] =
    await Promise.all([
      Wallet.find().sort({ order: 1, createdAt: 1 }).lean(),
      Category.find().sort({ order: 1, createdAt: 1 }).lean(),
      User.countDocuments(),
      sumsByWallet(),
      usageBy("categoryId"),
      usageBy("walletId"),
      usageBy("fromWalletId", Transfer),
      usageBy("toWalletId", Transfer),
      Recurring.find({}, { categoryId: 1, walletId: 1, active: 1, type: 1, amount: 1 }).lean(),
      AiChat.countDocuments(),
      AiInsight.countDocuments(),
      getRates(),
    ]);

  const usage = (rows: UsageRow[][], id: Types.ObjectId) =>
    rows
      .flatMap((list) => list.filter((r) => r._id?.equals(id)))
      .reduce((acc, r) => ({ total: acc.total + r.total, active: acc.active + r.active }), { total: 0, active: 0 });
  const recurringFor = (key: "categoryId" | "walletId", id: Types.ObjectId) => recurring.filter((r) => r[key].equals(id));

  const activeRecurring = recurring.filter((r) => r.active);

  return {
    hasUser: userCount > 0,
    wallets: wallets.map((w) => {
      const used = usage([byWallet, transfersFrom, transfersTo], w._id);
      const linked = recurringFor("walletId", w._id);
      const currency = currencyOf(w);
      const balance = balanceOf(w.initialBalance, sums.get(w._id));
      return {
        id: String(w._id),
        name: w.name,
        kind: w.kind,
        currency,
        icon: w.icon,
        color: w.color,
        archived: w.archived,
        initialBalance: w.initialBalance,
        /** O'z valyutasida (eng kichik birlikda) va bugungi kurs bilan so'mda */
        balance,
        balanceUzs: minorToUzs(balance, currency, rates[currency]),
        entries: used.active,
        /** Savatchadagi yozuvlar, takroriy to'lov yoki boshlang'ich qoldiq bo'lsa — butunlay o'chirib bo'lmaydi */
        deletable: used.total === 0 && linked.length === 0 && w.initialBalance === 0,
        activeRecurring: linked.filter((r) => r.active).length,
      };
    }),
    categories: categories.map((c) => {
      const used = usage([byCategory], c._id);
      const linked = recurringFor("categoryId", c._id);
      return {
        id: String(c._id),
        name: c.name,
        type: c.type,
        icon: c.icon,
        color: c.color,
        keywords: c.keywords,
        systemKey: c.systemKey ?? null,
        archived: c.archived,
        entries: used.active,
        deletable: !c.systemKey && used.total === 0 && linked.length === 0,
        activeRecurring: linked.filter((r) => r.active).length,
      };
    }),
    integrations: {
      ai: { configured: aiConfigured(), model: AI_MODEL, chats, insights },
      bot: { configured: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_ALLOWED_USER_ID) },
      recurring: {
        active: activeRecurring.length,
        // Summalar hamyon valyutasida — so'mga bugungi kurs bilan
        monthlyExpense: activeRecurring
          .filter((r) => r.type === "chiqim")
          .reduce((s, r) => {
            const currency = currencyOf(wallets.find((w) => w._id.equals(r.walletId)));
            return s + minorToUzs(r.amount, currency, rates[currency]);
          }, 0),
      },
    },
  };
}
