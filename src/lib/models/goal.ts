import { Schema, type InferSchemaType } from "mongoose";
import { defineModel } from "./_shared";

/**
 * Jamg'arma maqsadi (mashina, uy, sayohat...). Hisobdagi "idish": ajratilgan pul hamyonlardan
 * ayrilmaydi — foydalanuvchi qancha yig'ganini o'zi belgilab boradi. Summalar so'mda.
 */
const goalSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    targetAmount: { type: Number, required: true, min: 1 },
    savedAmount: { type: Number, default: 0, min: 0 },
    icon: { type: String, default: "Goal" },
    color: { type: String, default: "#008977" },
    /** Qachongacha (ixtiyoriy) — oyiga qancha yig'ish kerakligini hisoblash uchun */
    deadline: { type: Date, default: null },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type GoalDoc = InferSchemaType<typeof goalSchema>;
export const Goal = defineModel("Goal", goalSchema);
