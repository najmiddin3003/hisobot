import { Schema, type InferSchemaType } from "mongoose";
import { REVOKE_REASONS, SESSION_CHANNELS, SESSION_STATUSES } from "@/lib/domain";
import { defineModel } from "./_shared";

const sessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    channel: { type: String, enum: SESSION_CHANNELS, required: true },
    /** pending — parol to'g'ri, Google Authenticator kodi kutilmoqda; active — to'liq kirilgan */
    status: { type: String, enum: SESSION_STATUSES, required: true, default: "active" },
    /** Cookie/token'ning o'zi emas, faqat SHA-256 xeshi saqlanadi */
    tokenHash: { type: String, required: true, unique: true },
    userAgent: { type: String, default: "" },
    ip: { type: String, default: "" },
    telegramChatId: { type: Number, default: null },
    expiresAt: { type: Date, required: true },
    lastSeenAt: { type: Date, default: Date.now },
    revokedAt: { type: Date, default: null },
    revokeReason: { type: String, enum: REVOKE_REASONS, default: null },
  },
  { timestamps: true },
);

sessionSchema.index({ userId: 1, channel: 1, status: 1, revokedAt: 1 });
// Muddati tugagan seanslar tarix uchun 30 kun saqlanadi, keyin MongoDB o'zi o'chiradi
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

export type SessionDoc = InferSchemaType<typeof sessionSchema>;
export const Session = defineModel("Session", sessionSchema);
