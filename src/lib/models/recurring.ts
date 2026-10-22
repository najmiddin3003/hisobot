import { Schema, type InferSchemaType } from "mongoose";
import { TX_TYPES } from "@/lib/domain";
import { defineModel, moneyField, noteField } from "./_shared";

/** Har oy belgilangan kunda avtomatik qo'shiladigan to'lov (ijara, internet, obuna...) */
const recurringSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    type: { type: String, enum: TX_TYPES, required: true, default: "chiqim" },
    amount: moneyField,
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    walletId: { type: Schema.Types.ObjectId, ref: "Wallet", required: true },
    /** Oyning qaysi kuni; oy qisqa bo'lsa (masalan 31 → fevral) oyning oxirgi kuni olinadi */
    dayOfMonth: { type: Number, required: true, min: 1, max: 31 },
    note: noteField,
    active: { type: Boolean, default: true },
    /** Oxirgi marta qaysi oy uchun yozuv yaratilgani, "YYYY-MM" */
    lastGeneratedMonth: { type: String, default: null },
  },
  { timestamps: true },
);

export type RecurringDoc = InferSchemaType<typeof recurringSchema>;
export const Recurring = defineModel("Recurring", recurringSchema);
