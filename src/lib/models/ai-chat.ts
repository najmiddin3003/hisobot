import { Schema, type InferSchemaType } from "mongoose";
import { AI_TURN_STATUSES } from "@/lib/ai/shared";
import { defineModel } from "./_shared";

/** Saytda ko'rsatiladigan xabar */
const turnSchema = new Schema(
  {
    role: { type: String, enum: ["user", "assistant"], required: true },
    text: { type: String, default: "" },
    /** Javob uchun qaysi ma'lumotlar o'qilgani ("Oylik hisobot o'qilmoqda"...) */
    tools: { type: [String], default: [] },
    status: { type: String, enum: AI_TURN_STATUSES, default: "ok" },
    at: { type: Date, required: true },
  },
  { _id: false },
);

/** AI yordamchi bilan suhbat */
const aiChatSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 80 },
    turns: { type: [turnSchema], default: [] },
    /**
     * Claude API'ga har safar qayta yuboriladigan to'liq tarix (thinking va vosita bloklari bilan).
     * Faqat oxiriga qo'shiladi, ichidagi bloklar hech qachon o'zgartirilmaydi.
     */
    apiMessages: { type: [Schema.Types.Mixed], default: [] },
    aiModel: { type: String, default: null },
  },
  { timestamps: true, minimize: false },
);

aiChatSchema.index({ updatedAt: -1 });

export type AiChatDoc = InferSchemaType<typeof aiChatSchema>;
export const AiChat = defineModel("AiChat", aiChatSchema);
