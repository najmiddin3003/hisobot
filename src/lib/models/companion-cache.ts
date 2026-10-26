import { Schema, type InferSchemaType } from "mongoose";
import { defineModel } from "./_shared";

/** Oydin uchun AI yozgan gaplar — bir necha soat saqlanadi, har sahifada qayta yozdirilmaydi */
const companionCacheSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    /** [{ text, mood }] — src/lib/companion.ts dagi CompanionLine */
    lines: { type: Schema.Types.Mixed, required: true },
    /** Toshkent kuni "YYYY-MM-DD" — kun almashsa yangidan yoziladi */
    day: { type: String, required: true },
    aiModel: { type: String, default: null },
    generatedAt: { type: Date, required: true },
  },
  { timestamps: true, minimize: false },
);

export type CompanionCacheDoc = InferSchemaType<typeof companionCacheSchema>;
export const CompanionCache = defineModel("CompanionCache", companionCacheSchema);
