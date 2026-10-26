import { Schema, type InferSchemaType } from "mongoose";
import { CURRENCIES } from "@/lib/currency";
import { defineModel } from "./_shared";

/** Valyuta kursi: 1 birlik necha so'm. Har kun uchun bitta yozuv (kun ichida yangilanib boradi) */
const rateSchema = new Schema(
  {
    currency: { type: String, enum: CURRENCIES.filter((c) => c !== "UZS"), required: true },
    /** Toshkent vaqti bo'yicha kun, "YYYY-MM-DD" */
    day: { type: String, required: true },
    rate: { type: Number, required: true, min: 0 },
    /** Qayerdan olingani: cbu, er-api (zaxira), coingecko, binance, usd (USDT ≈ dollar) */
    source: { type: String, required: true },
    fetchedAt: { type: Date, required: true },
  },
  { timestamps: false },
);

rateSchema.index({ currency: 1, day: 1 }, { unique: true });
rateSchema.index({ currency: 1, fetchedAt: -1 });

export type RateDoc = InferSchemaType<typeof rateSchema>;
export const Rate = defineModel("Rate", rateSchema);
