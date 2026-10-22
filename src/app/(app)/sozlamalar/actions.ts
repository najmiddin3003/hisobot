"use server";

import bcrypt from "bcryptjs";
import { isValidObjectId } from "mongoose";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { lockedMessage, lockedMinutesLeft, registerFailedAttempt } from "@/lib/auth/attempts";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/constants";
import { decrypt } from "@/lib/auth/crypto";
import { requireActionSession } from "@/lib/auth/guard";
import { revokeSessions } from "@/lib/auth/session";
import { verifyTotp } from "@/lib/auth/totp";
import { issueBackupCodes } from "@/lib/auth/two-factor";
import { Session, User } from "@/lib/models";

export type PasswordState = { error?: string; success?: boolean } | undefined;
export type BackupCodesState = { error?: string; codes?: string[] } | undefined;

const passwordSchema = z
  .object({
    current: z.string().min(1, "Joriy parolni kiriting"),
    next: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Yangi parol kamida ${MIN_PASSWORD_LENGTH} belgi bo'lishi kerak`)
      .max(200),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, { message: "Yangi parollar mos kelmadi" })
  .refine((v) => v.next !== v.current, { message: "Yangi parol eskisidan farq qilishi kerak" });

export async function changePasswordAction(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const session = await requireActionSession();
  const parsed = passwordSchema.safeParse({
    current: formData.get("current"),
    next: formData.get("next"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ma'lumotlar noto'g'ri" };

  const user = await User.findById(session.user.id);
  if (!user) redirect("/login");
  const minutes = lockedMinutesLeft(user);
  if (minutes) return { error: lockedMessage(minutes) };

  if (!(await bcrypt.compare(parsed.data.current, user.passwordHash))) {
    const result = await registerFailedAttempt(user._id);
    return { error: result.locked ? lockedMessage(15) : "Joriy parol noto'g'ri" };
  }

  user.passwordHash = await bcrypt.hash(parsed.data.next, 12);
  user.failedLoginCount = 0;
  await user.save();
  // Boshqa barcha seanslar (bot ham) yopiladi, shu seans qoladi
  await revokeSessions({ userId: user._id, excludeSessionId: session.sessionId }, "password_changed");
  refresh();
  return { success: true };
}

export async function regenerateBackupCodesAction(
  _prev: BackupCodesState,
  formData: FormData,
): Promise<BackupCodesState> {
  const session = await requireActionSession();
  const user = await User.findById(session.user.id);
  if (!user?.totpSecret) redirect("/login");
  const minutes = lockedMinutesLeft(user);
  if (minutes) return { error: lockedMessage(minutes) };

  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  const step = verifyTotp(decrypt(user.totpSecret), code, { lastUsedStep: user.totpLastStep });
  if (step === null) {
    const result = await registerFailedAttempt(user._id);
    return { error: result.locked ? lockedMessage(15) : "Kod noto'g'ri yoki eskirgan" };
  }

  user.totpLastStep = step;
  const codes = issueBackupCodes(user);
  await user.save();
  refresh();
  return { codes };
}

export async function revokeSessionAction(sessionId: string) {
  const session = await requireActionSession();
  if (!isValidObjectId(sessionId) || session.sessionId.equals(sessionId)) return;
  await Session.updateOne(
    { _id: sessionId, userId: session.user.id, revokedAt: null },
    { revokedAt: new Date(), revokeReason: "manual" },
  );
  refresh();
}
