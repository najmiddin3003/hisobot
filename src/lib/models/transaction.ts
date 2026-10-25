import { Schema, type InferSchemaType } from "mongoose";
import { CURRENCIES } from "@/lib/currency";
import { DEBT_ROLES, TX_TYPES } from "@/lib/domain";
import { defineModel, deletedAtField, moneyField, noteField, sourceField } from "./_shared";

const transactionSchema = new Schema(
  {
    type: { type: String, enum: TX_TYPES, required: true },
    /** So'mdagi qiymat — barcha hisobotlar shu bilan (chet valyutada — kiritilgan paytdagi kurs bilan) */
    amount: moneyField,
    /** Hamyon valyutasi; eski yozuvlarda yo'q — so'm */
    currency: { type: String, enum: CURRENCIES, default: "UZS" },
    /** Chet valyutadagi asl summa (eng kichik birlikda: sent, satoshi); so'mli yozuvda null */
    originalAmount: { type: Number, default: null },
    /** 1 birlik necha so'm edi (chet valyutali yozuvda) */
    rate: { type: Number, default: null },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    walletId: { type: Schema.Types.ObjectId, ref: "Wallet", required: true },
    note: noteField,
    /** Pul haqiqatda qachon sarflangan/kelgan (foydalanuvchi o'zgartirishi mumkin) */
    occurredAt: { type: Date, required: true, default: Date.now },
    source: sourceField,
    debtId: { type: Schema.Types.ObjectId, ref: "Debt", default: null },
    debtRole: { type: String, enum: DEBT_ROLES, default: null },
    recurringId: { type: Schema.Types.ObjectId, ref: "Recurring", default: null },
    deletedAt: deletedAtField,
  },
  // createdAt — tizimga qachon kiritilgani
  { timestamps: true },
);

transactionSchema.index({ deletedAt: 1, occurredAt: -1 });
transactionSchema.index({ categoryId: 1, occurredAt: -1 });
transactionSchema.index({ walletId: 1 });
transactionSchema.index({ debtId: 1 });

export type TransactionDoc = InferSchemaType<typeof transactionSchema>;
export const Transaction = defineModel("Transaction", transactionSchema);
