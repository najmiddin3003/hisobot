import { Schema, type InferSchemaType } from "mongoose";
import { DEBT_DIRECTIONS, DEBT_KINDS, DEBT_STATUSES } from "@/lib/domain";
import { defineModel, deletedAtField, moneyField, noteField, sourceField } from "./_shared";

/**
 * Qarz, xaq yoki kredit. To'lovlar alohida saqlanmaydi — ular debtId bilan
 * bog'langan Transaction yozuvlari (kirim/chiqim) bo'lib turadi.
 */
const debtSchema = new Schema(
  {
    direction: { type: String, enum: DEBT_DIRECTIONS, required: true },
    kind: { type: String, enum: DEBT_KINDS, required: true, default: "shaxs" },
    /** Odamning ismi yoki bank nomi */
    counterparty: { type: String, required: true, trim: true, maxlength: 120 },
    amount: moneyField,
    startedAt: { type: Date, required: true, default: Date.now },
    dueDate: { type: Date, default: null },
    // Faqat kredit uchun
    monthlyPayment: { type: Number, default: null },
    paymentDay: { type: Number, min: 1, max: 31, default: null },
    termMonths: { type: Number, min: 1, default: null },
    /** Tizimga kiritilishidan oldin qaytarilgan summa (eski qarz/kredit uchun) */
    paidBefore: { type: Number, min: 0, default: 0 },
    note: noteField,
    status: { type: String, enum: DEBT_STATUSES, required: true, default: "ochiq" },
    closedAt: { type: Date, default: null },
    /** tolandi — to'liq qaytarilgani uchun avtomatik yopilgan; qolda — foydalanuvchi o'zi yopgan (masalan kechilgan) */
    closeReason: { type: String, enum: ["tolandi", "qolda"], default: null },
    source: sourceField,
    deletedAt: deletedAtField,
  },
  { timestamps: true },
);

debtSchema.index({ deletedAt: 1, direction: 1, status: 1 });

export type DebtDoc = InferSchemaType<typeof debtSchema>;
export const Debt = defineModel("Debt", debtSchema);
