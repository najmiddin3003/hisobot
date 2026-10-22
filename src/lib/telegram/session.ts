import "server-only";
import type { Types } from "mongoose";
import { SESSION_TTL_MS } from "@/lib/auth/constants";
import { hashToken, randomToken } from "@/lib/auth/crypto";
import type { RevokeReason } from "@/lib/domain";
import { Session } from "@/lib/models";

export type BotSessionResult =
  | { status: "ok"; userId: Types.ObjectId; sessionId: Types.ObjectId }
  | { status: "none" }
  | { status: "expired" }
  | { status: "revoked"; reason: RevokeReason | null };

/** Shu chat uchun eng so'nggi bot seansi: amaldami, muddati tugaganmi yoki yopilganmi */
export async function readBotSession(chatId: number): Promise<BotSessionResult> {
  const session = await Session.findOne({ channel: "telegram", telegramChatId: chatId, status: "active" })
    .sort({ createdAt: -1 })
    .lean();
  if (!session) return { status: "none" };
  if (session.revokedAt) return { status: "revoked", reason: session.revokeReason ?? null };
  if (session.expiresAt <= new Date()) return { status: "expired" };

  if (Date.now() - session.lastSeenAt.getTime() > 60_000) {
    await Session.updateOne({ _id: session._id }, { lastSeenAt: new Date() });
  }
  return { status: "ok", userId: session.userId, sessionId: session._id };
}

/** Botda yangi seans (12 soat). Botdagi boshqa seanslar yopiladi — bir vaqtda faqat bittasi */
export async function startBotSession(userId: Types.ObjectId, chatId: number) {
  await Session.updateMany(
    { userId, channel: "telegram", status: "active", revokedAt: null },
    { revokedAt: new Date(), revokeReason: "new_login" },
  );
  await Session.create({
    userId,
    channel: "telegram",
    status: "active",
    tokenHash: hashToken(randomToken()),
    telegramChatId: chatId,
    userAgent: "Telegram bot",
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  });
}

export async function endBotSession(chatId: number, reason: RevokeReason) {
  await Session.updateMany(
    { channel: "telegram", telegramChatId: chatId, status: "active", revokedAt: null },
    { revokedAt: new Date(), revokeReason: reason },
  );
}
