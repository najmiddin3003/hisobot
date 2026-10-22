import { Schema, type InferSchemaType } from "mongoose";
import { defineModel } from "./_shared";

/**
 * Telegram botdagi suhbat holati (qaysi qadamda turibdi, qoralama yozuv).
 * Vercel'da har bir xabar alohida so'rov bo'lgani uchun xotirada emas, bazada saqlanadi.
 */
const botStateSchema = new Schema(
  {
    chatId: { type: Number, required: true, unique: true },
    step: { type: String, default: null },
    data: { type: Schema.Types.Mixed, default: {} },
    /** Oxirgi ishlatilgan hamyon — keyingi yozuvda avtomatik tanlanadi */
    lastWalletId: { type: String, default: null },
  },
  { timestamps: true, minimize: false },
);

export type BotStateDoc = InferSchemaType<typeof botStateSchema>;
export const BotState = defineModel("BotState", botStateSchema);
