"use server";

import bcrypt from "bcryptjs";
import type { Types } from "mongoose";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  clearFailedAttempts,
  lockedMessage,
  lockedMinutesLeft,
  registerFailedAttempt,
} from "@/lib/auth/attempts";
import { decrypt, hashBackupCode, randomToken, safeEqual } from "@/lib/auth/crypto";
import { clearPendingLogin, getPendingLogin, startPendingLogin, startWebSession } from "@/lib/auth/session";
import { verifyTotp } from "@/lib/auth/totp";
import { issueBackupCodes } from "@/lib/auth/two-factor";
import { connectDB } from "@/lib/db";
import { notifyNewWebLogin } from "@/lib/telegram/notify";
import { describeUserAgent } from "@/lib/user-agent";
import { User } from "@/lib/models";

export type LoginState = { error?: string; username?: string } | undefined;
export type CodeState = { error?: string } | undefined;
export type SetupState = { error?: string; backupCodes?: string[] } | undefined;

const INVALID_CREDENTIALS = "Login yoki parol noto'g'ri";

const loginSchema = z.object({
  username: z.string().trim().toLowerCase().min(1).max(64),
  password: z.string().min(1).max(200),
});

// Mavjud bo'lmagan login uchun ham bcrypt ishlaydi — javob vaqtidan login borligini bilib bo'lmasin
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= bcrypt.hash(randomToken(), 12));

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Login va parolni kiriting" };
  const { username, password } = parsed.data;

  await connectDB();
  const user = await User.findOne({ username });
  if (!user) {
    await bcrypt.compare(password, await getDummyHash());
    return { error: INVALID_CREDENTIALS, username };
  }

  const minutes = lockedMinutesLeft(user);
  if (minutes) return { error: lockedMessage(minutes), username };

  if (!(await bcrypt.compare(password, user.passwordHash))) {
    const result = await registerFailedAttempt(user._id);
    if (result.locked) return { error: lockedMessage(15), username };
    const warning =
      result.attemptsLeft <= 2 ? ` Yana ${result.attemptsLeft} ta xatodan keyin 15 daqiqaga bloklanadi.` : "";
    return { error: `${INVALID_CREDENTIALS}.${warning}`, username };
  }

  await startPendingLogin(user._id);
  redirect(user.totpEnabled ? "/login/kod" : "/login/sozlash");
}

/** 2FA muvaffaqiyatli: urinishlar hisobi tozalanadi va to'liq seans ochiladi */
async function completeLogin(userId: Types.ObjectId, pendingSessionId: Types.ObjectId) {
  await clearFailedAttempts(userId);
  await clearPendingLogin(pendingSessionId);
  const { userAgent, ip, closedPrevious } = await startWebSession(userId);
  notifyNewWebLogin({ device: describeUserAgent(userAgent), ip, closedPrevious });
}

export async function verifyCodeAction(_prev: CodeState, formData: FormData): Promise<CodeState> {
  const pending = await getPendingLogin();
  if (!pending) redirect("/login?sabab=vaqt");
  const { user, sessionId } = pending;
  if (!user.totpEnabled || !user.totpSecret) redirect("/login/sozlash");
  if (lockedMinutesLeft(user)) {
    await clearPendingLogin(sessionId);
    redirect("/login?sabab=bloklandi");
  }

  const useBackup = formData.get("mode") === "backup";
  const input = String(formData.get("code") ?? "").trim();
  let verified = false;

  if (useBackup) {
    const hash = hashBackupCode(input);
    const entry = user.backupCodes.find((c) => !c.usedAt && safeEqual(c.hash, hash));
    if (entry) {
      entry.usedAt = new Date();
      verified = true;
    }
  } else {
    const step = verifyTotp(decrypt(user.totpSecret), input.replace(/\s/g, ""), {
      lastUsedStep: user.totpLastStep,
    });
    if (step !== null) {
      user.totpLastStep = step;
      verified = true;
    }
  }

  if (!verified) {
    const result = await registerFailedAttempt(user._id);
    if (result.locked) {
      await clearPendingLogin(sessionId);
      redirect("/login?sabab=bloklandi");
    }
    return {
      error: useBackup
        ? "Zaxira kod noto'g'ri yoki avval ishlatilgan"
        : "Kod noto'g'ri yoki eskirgan. Ilovadagi eng so'nggi kodni kiriting.",
    };
  }

  await user.save();
  await completeLogin(user._id, sessionId);
  redirect("/");
}

export async function confirmSetupAction(_prev: SetupState, formData: FormData): Promise<SetupState> {
  const pending = await getPendingLogin();
  if (!pending) redirect("/login?sabab=vaqt");
  const { user, sessionId } = pending;
  if (user.totpEnabled) redirect("/login/kod");
  if (!user.totpSecret) return { error: "Sahifani yangilang va QR kodni qaytadan skanerlang" };
  if (lockedMinutesLeft(user)) {
    await clearPendingLogin(sessionId);
    redirect("/login?sabab=bloklandi");
  }

  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  const step = verifyTotp(decrypt(user.totpSecret), code, { lastUsedStep: user.totpLastStep });
  if (step === null) {
    const result = await registerFailedAttempt(user._id);
    if (result.locked) {
      await clearPendingLogin(sessionId);
      redirect("/login?sabab=bloklandi");
    }
    return { error: "Kod noto'g'ri. QR kodni skanerlaganingizni tekshiring va eng so'nggi kodni kiriting." };
  }

  user.totpEnabled = true;
  user.totpLastStep = step;
  const backupCodes = issueBackupCodes(user);
  await user.save();

  await completeLogin(user._id, sessionId);
  // Kodlar faqat shu yerda bir marta ko'rsatiladi — bazada faqat xeshlari qoladi
  return { backupCodes };
}
