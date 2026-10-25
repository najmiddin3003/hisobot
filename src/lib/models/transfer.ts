import { Schema, type InferSchemaType } from "mongoose";
import { defineModel, deletedAtField, moneyField, noteField, sourceField } from "./_shared";

/** Hamyonlar o'rtasidagi o'tkazma: kirim ham, chiqim ham hisoblanmaydi, faqat qoldiqlar o'zgaradi */
const transferSchema = new Schema(
  {
    fromWalletId: { type: Schema.Types.ObjectId, ref: "Wallet", required: true },
    toWalletId: { type: Schema.Types.ObjectId, ref: "Wallet", required: true },
    /** Chiqqan hamyon valyutasida (eng kichik birlikda) */
    amount: moneyField,
    /** Tushgan hamyon valyutasida; valyutalar bir xil bo'lsa null (= amount) */
    toAmount: { type: Number, default: null },
    note: noteField,
    occurredAt: { type: Date, required: true, default: Date.now },
    source: sourceField,
    deletedAt: deletedAtField,
  },
  { timestamps: true },
);

transferSchema.index({ deletedAt: 1, occurredAt: -1 });

export type TransferDoc = InferSchemaType<typeof transferSchema>;
export const Transfer = defineModel("Transfer", transferSchema);
