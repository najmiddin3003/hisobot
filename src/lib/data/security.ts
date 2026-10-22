import "server-only";
import { getCurrentSession, requireUser } from "@/lib/auth/dal";
import { backupCodesLeft } from "@/lib/auth/two-factor";
import { connectDB } from "@/lib/db";
import { Session, User } from "@/lib/models";
import { describeUserAgent } from "@/lib/user-agent";

export type SessionRow = Awaited<ReturnType<typeof getSecurityOverview>>["sessions"][number];

export async function getSecurityOverview() {
  const user = await requireUser();
  const current = await getCurrentSession();
  await connectDB();

  const [account, sessions] = await Promise.all([
    User.findById(user.id, { backupCodes: 1, totpEnabled: 1 }).lean(),
    Session.find({ userId: user.id, status: "active" }).sort({ createdAt: -1 }).limit(12).lean(),
  ]);

  const now = Date.now();
  return {
    totpEnabled: Boolean(account?.totpEnabled),
    backupCodesLeft: account ? backupCodesLeft(account) : 0,
    sessions: sessions.map((s) => ({
      id: String(s._id),
      channel: s.channel,
      device: s.channel === "telegram" ? "Telegram bot" : describeUserAgent(s.userAgent),
      ip: s.ip,
      createdAt: s.createdAt,
      lastSeenAt: s.lastSeenAt,
      expiresAt: s.expiresAt,
      isCurrent: current.status === "ok" && s._id.equals(current.sessionId),
      state: s.revokedAt ? ("revoked" as const) : s.expiresAt.getTime() <= now ? ("expired" as const) : ("active" as const),
      revokeReason: s.revokeReason,
      revokedAt: s.revokedAt,
    })),
  };
}
