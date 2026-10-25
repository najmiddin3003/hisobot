import "server-only";
import { requireUser } from "@/lib/auth/dal";
import { connectDB } from "@/lib/db";
import { daysUntil } from "@/lib/dates";
import { Goal } from "@/lib/models";

export type GoalItem = Awaited<ReturnType<typeof getGoals>>[number];

/** Jamg'arma maqsadlari: qancha yig'ilgani, foizi va muddat bo'lsa — oyiga qancha kerakligi */
export async function getGoals() {
  await requireUser();
  await connectDB();
  const now = new Date();
  const goals = await Goal.find().sort({ order: 1, createdAt: 1 }).lean();
  return goals.map((g) => {
    const remaining = Math.max(g.targetAmount - g.savedAmount, 0);
    const days = g.deadline ? daysUntil(g.deadline, now) : null;
    // Muddatgacha qolgan oylar (kamida 1) — oyiga teng bo'lib yig'ilsa
    const months = days !== null ? Math.max(Math.ceil(days / 30), 1) : null;
    return {
      id: String(g._id),
      name: g.name,
      icon: g.icon,
      color: g.color,
      targetAmount: g.targetAmount,
      savedAmount: g.savedAmount,
      remaining,
      progress: Math.min(g.savedAmount / g.targetAmount, 1),
      done: remaining === 0,
      deadline: g.deadline?.toISOString() ?? null,
      daysLeft: days,
      monthlyNeeded: months !== null && remaining > 0 ? Math.ceil(remaining / months) : null,
    };
  });
}
