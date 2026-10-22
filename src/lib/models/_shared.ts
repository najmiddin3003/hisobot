import mongoose, { type Schema } from "mongoose";
import { SOURCES } from "@/lib/domain";

function createModel<TSchema extends Schema>(name: string, schema: TSchema) {
  return mongoose.model(name, schema);
}

/**
 * Model yaratadi. Dev rejimida (hot reload) sxema o'zgarsa, eski model keshda
 * qolib ketmasligi uchun qayta ro'yxatdan o'tkaziladi — aks holda yangi maydonlar saqlanmaydi.
 */
export function defineModel<TSchema extends Schema>(name: string, schema: TSchema) {
  const existing = mongoose.models[name];
  if (existing && process.env.NODE_ENV === "production") {
    return existing as ReturnType<typeof createModel<TSchema>>;
  }
  if (existing) mongoose.deleteModel(name);
  return createModel(name, schema);
}

/** Summalar so'mda, butun son sifatida saqlanadi */
export const moneyField = {
  type: Number,
  required: true,
  min: 1,
  validate: {
    validator: Number.isInteger,
    message: "Summa butun son bo'lishi kerak",
  },
} as const;

export const sourceField = {
  type: String,
  enum: SOURCES,
  required: true,
  default: "web",
} as const;

export const noteField = {
  type: String,
  trim: true,
  maxlength: 500,
  default: "",
} as const;

/** O'chirilgan yozuvlar savatchaga tushadi: deletedAt to'ldiriladi, hujjat bazada qoladi */
export const deletedAtField = { type: Date, default: null } as const;
