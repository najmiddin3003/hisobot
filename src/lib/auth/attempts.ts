import "server-only";
import type { Types } from "mongoose";
import { User } from "@/lib/models";
import { LOCK_DURATION_MS, MAX_FAILED_ATTEMPTS } from "./constants";

/** Akkaunt vaqtincha bloklangan bo'lsa, qolgan daqiqalar; aks holda null */
export function lockedMinutesLeft(user: { lockedUntil?: Date | null }) {
  if (!user.lockedUntil) return null;
  const ms = user.lockedUntil.getTime() - Date.now();
  return ms > 0 ? Math.ceil(ms / 60_000) : null;
}

export function lockedMessage(minutes: number) {
  return `Juda ko'p noto'g'ri urinish. ${minutes} daqiqadan keyin qayta urinib ko'ring.`;
}

/**
 * Noto'g'ri parol yoki kod. 5-xatodan keyin akkaunt 15 daqiqaga bloklanadi.
 * Parol va 2FA kodi xatolari birga hisoblanadi.
 */
export async function registerFailedAttempt(userId: Types.ObjectId) {
  const user = await User.findByIdAndUpdate(userId, { $inc: { failedLoginCount: 1 } }, { returnDocument: "after" });
  if (!user) return { locked: false, attemptsLeft: 0 };

  if (user.failedLoginCount >= MAX_FAILED_ATTEMPTS) {
    await User.updateOne(
      { _id: userId },
      { failedLoginCount: 0, lockedUntil: new Date(Date.now() + LOCK_DURATION_MS) },
    );
    return { locked: true, attemptsLeft: 0 };
  }
  return { locked: false, attemptsLeft: MAX_FAILED_ATTEMPTS - user.failedLoginCount };
}

export async function clearFailedAttempts(userId: Types.ObjectId) {
  await User.updateOne({ _id: userId }, { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() });
}
