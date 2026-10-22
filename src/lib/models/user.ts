import { Schema, type InferSchemaType } from "mongoose";
import { defineModel } from "./_shared";

const backupCodeSchema = new Schema(
  {
    hash: { type: String, required: true },
    usedAt: { type: Date, default: null },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    /** Google Authenticator kaliti — ENCRYPTION_KEY bilan shifrlangan holda */
    totpSecret: { type: String, default: null },
    totpEnabled: { type: Boolean, default: false },
    /** Oxirgi ishlatilgan kodning vaqt qadami — bitta kodni ikki marta ishlatib bo'lmasligi uchun */
    totpLastStep: { type: Number, default: null },
    backupCodes: { type: [backupCodeSchema], default: [] },
    failedLoginCount: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof userSchema>;
export const User = defineModel("User", userSchema);
