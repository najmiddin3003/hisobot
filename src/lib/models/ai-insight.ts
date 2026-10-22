import { Schema, type InferSchemaType } from "mongoose";
import { defineModel } from "./_shared";

/** Dashboard'dagi oylik AI tahlil — faqat "Yangilash" bosilganda qayta tayyorlanadi */
const aiInsightSchema = new Schema(
  {
    /** "YYYY-MM" */
    month: { type: String, required: true, unique: true },
    /** Tahlil natijasi (src/lib/ai/insight-schema.ts dagi sxema bo'yicha) */
    data: { type: Schema.Types.Mixed, required: true },
    aiModel: { type: String, default: null },
    generatedAt: { type: Date, required: true },
  },
  { timestamps: true, minimize: false },
);

export type AiInsightDoc = InferSchemaType<typeof aiInsightSchema>;
export const AiInsight = defineModel("AiInsight", aiInsightSchema);
