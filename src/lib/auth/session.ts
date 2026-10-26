import "server-only";
import { cookies, headers } from "next/headers";
import { io } from "next/cache";
import type { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import type { RevokeReason } from "@/lib/domain";
import { Session, User, type SessionDoc } from "@/lib/models";
import { PENDING_COOKIE, PENDING_TTL_MS, SESSION_COOKIE, SESSION_TTL_MS, type LoginReason } from "./constants";
import { hashToken, randomToken } from "./crypto";

const cookieOptions = (expires: Date) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  expires,
});

/**
 * Cookie'ni o'chirish. Oddiy delete() Secure belgisisiz yuboradi — brauzer esa
 * __Host- cookie'ni faqat Secure bilan o'chirishga ruxsat beradi, shuning uchun
 * xuddi o'rnatilgandagi sozlamalar bilan muddati o'tgan qiymat yoziladi.
 */
async function expireCookie(name: string) {
  (await cookies()).set(name, "", cookieOptions(new Date(0)));
}

async function requestMeta() {
  const h = await headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "").trim();
  return { ip, userAgent: (h.get("user-agent") ?? "").slice(0, 300) };
}

// ---- 1-qadam: parol to'g'ri, 2FA kodi kutilmoqda ----

export async function startPendingLogin(userId: Types.ObjectId) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + PENDING_TTL_MS);
  await Session.create({
    userId,
    channel: "web",
    status: "pending",
    tokenHash: hashToken(token),
    expiresAt,
    ...(await requestMeta()),
  });
  (await cookies()).set(PENDING_COOKIE, token, cookieOptions(expiresAt));
}

/** Parol bosqichidan o'tgan, lekin hali kod kiritmagan foydalanuvchi */
export async function getPendingLogin() {
  const token = (await cookies()).get(PENDING_COOKIE)?.value;
  if (!token) return null;
  // Muddatni hozirgi vaqt bilan solishtiramiz — faqat so'rov paytida, oldindan tayyorlashda emas
  await io();
  await connectDB();
  const session = await Session.findOne({
    tokenHash: hashToken(token),
    channel: "web",
    status: "pending",
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  }).lean();
  if (!session) return null;
  const user = await User.findById(session.userId);
  return user ? { sessionId: session._id, user } : null;
}

export async function clearPendingLogin(sessionId?: Types.ObjectId) {
  if (sessionId) await Session.deleteOne({ _id: sessionId, status: "pending" });
  await expireCookie(PENDING_COOKIE);
}

// ---- To'liq kirish ----

/**
 * Yangi seans ochadi; saytdagi boshqa barcha seanslar darhol yopiladi (bir vaqtda faqat bitta).
 * Qurilma ma'lumoti va oldingi seans yopilgani qaytadi — Telegram xabari uchun.
 */
export async function startWebSession(userId: Types.ObjectId) {
  const { modifiedCount } = await Session.updateMany(
    { userId, channel: "web", status: "active", revokedAt: null },
    { revokedAt: new Date(), revokeReason: "new_login" },
  );

  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const meta = await requestMeta();
  await Session.create({
    userId,
    channel: "web",
    status: "active",
    tokenHash: hashToken(token),
    expiresAt,
    ...meta,
  });
  (await cookies()).set(SESSION_COOKIE, token, cookieOptions(expiresAt));
  return { ...meta, closedPrevious: modifiedCount > 0 };
}

export type WebSessionResult =
  | {
      status: "ok";
      sessionId: Types.ObjectId;
      expiresAt: Date;
      lastSeenAt: Date;
      user: { id: string; username: string };
    }
  | { status: "invalid"; reason: LoginReason | null };

/** Cookie'dagi seansni bazadan tekshiradi. Yopilgan bo'lsa — nima sababdan */
export async function readWebSession(): Promise<WebSessionResult> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return { status: "invalid", reason: null };

  await io();
  await connectDB();
  // Seans va foydalanuvchi bitta so'rovda — har bir sahifa bazaga bir marta kamroq boradi
  const [session] = await Session.aggregate<SessionDoc & { _id: Types.ObjectId; user: { _id: Types.ObjectId; username: string }[] }>([
    { $match: { tokenHash: hashToken(token), channel: "web", status: "active" } },
    { $limit: 1 },
    { $lookup: { from: User.collection.name, localField: "userId", foreignField: "_id", as: "user", pipeline: [{ $project: { username: 1 } }] } },
  ]);
  if (!session) return { status: "invalid", reason: null };
  if (session.revokedAt) return { status: "invalid", reason: reasonFor(session.revokeReason) };
  if (session.expiresAt <= new Date()) return { status: "invalid", reason: "muddat" };

  const user = session.user[0];
  if (!user) return { status: "invalid", reason: null };

  return {
    status: "ok",
    sessionId: session._id,
    expiresAt: session.expiresAt,
    lastSeenAt: session.lastSeenAt,
    user: { id: String(user._id), username: user.username },
  };
}

function reasonFor(revokeReason: RevokeReason | null | undefined): LoginReason {
  switch (revokeReason) {
    case "new_login":
      return "yangi-kirish";
    case "logout":
      return "chiqildi";
    case "password_changed":
      return "parol";
    default:
      return "yopildi";
  }
}

export async function revokeSessions(
  filter: { userId: Types.ObjectId | string; excludeSessionId?: Types.ObjectId },
  reason: RevokeReason,
) {
  await Session.updateMany(
    {
      userId: filter.userId,
      status: "active",
      revokedAt: null,
      ...(filter.excludeSessionId ? { _id: { $ne: filter.excludeSessionId } } : {}),
    },
    { revokedAt: new Date(), revokeReason: reason },
  );
}

/** Joriy seansni yopadi va cookie'ni o'chiradi */
export async function endWebSession(reason: RevokeReason) {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await connectDB();
    await Session.updateOne(
      { tokenHash: hashToken(token), revokedAt: null },
      { revokedAt: new Date(), revokeReason: reason },
    );
  }
  await expireCookie(SESSION_COOKIE);
}

/** "Oxirgi faollik" vaqtini yangilaydi (bazaga ortiqcha yozmaslik uchun daqiqasiga bir marta) */
export async function touchSession(sessionId: Types.ObjectId, lastSeenAt: Date) {
  if (Date.now() - lastSeenAt.getTime() < 60_000) return;
  await Session.updateOne({ _id: sessionId }, { lastSeenAt: new Date() });
}
