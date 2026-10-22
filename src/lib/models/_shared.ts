import { SOURCES } from "@/lib/domain";

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
