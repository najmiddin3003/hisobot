import "server-only";
import { requireUser } from "@/lib/auth/dal";
import { connectDB } from "@/lib/db";
import { Category, User, Wallet } from "@/lib/models";

export async function getSettingsOverview() {
  // Seans cookie'si o'qilgani uchun baza har doim so'rov paytida o'qiladi (build vaqtida emas)
  await requireUser();
  await connectDB();

  const [wallets, categories, userCount] = await Promise.all([
    Wallet.find({ archived: false }).sort({ order: 1, createdAt: 1 }).lean(),
    Category.find({ archived: false }).sort({ order: 1, createdAt: 1 }).lean(),
    User.countDocuments(),
  ]);

  return {
    hasUser: userCount > 0,
    wallets: wallets.map((w) => ({
      id: String(w._id),
      name: w.name,
      kind: w.kind,
      icon: w.icon,
      color: w.color,
    })),
    categories: categories.map((c) => ({
      id: String(c._id),
      name: c.name,
      type: c.type,
      icon: c.icon,
      color: c.color,
      isSystem: Boolean(c.systemKey),
      keywordCount: c.keywords.length,
    })),
  };
}
