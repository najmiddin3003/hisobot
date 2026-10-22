import { Schema, type InferSchemaType } from "mongoose";
import { DEBT_ROLES, TX_TYPES } from "@/lib/domain";
import { defineModel, deletedAtField, moneyField, noteField, sourceField } from "./_shared";

const transactionSchema = new Schema(
  {
    type: { type: String, enum: TX_TYPES, required: true },
    amount: moneyField,
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
