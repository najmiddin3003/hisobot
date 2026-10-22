import { Schema, type InferSchemaType } from "mongoose";
import { SYSTEM_CATEGORY_KEYS, TX_TYPES } from "@/lib/domain";
import { defineModel } from "./_shared";

const categorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    type: { type: String, enum: TX_TYPES, required: true },
    icon: { type: String, default: "Ellipsis" },
    color: { type: String, default: "#64748b" },
    /** Botda "45000 taksi" deb yozilganda kategoriyani topish uchun kalit so'zlar */
    keywords: { type: [String], default: [] },
    systemKey: { type: String, enum: SYSTEM_CATEGORY_KEYS, default: null },
    order: { type: Number, default: 0 },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true },
);

categorySchema.index(
  { systemKey: 1 },
  { unique: true, partialFilterExpression: { systemKey: { $type: "string" } } },
);
categorySchema.index({ type: 1, archived: 1, order: 1 });

export type CategoryDoc = InferSchemaType<typeof categorySchema>;
export const Category = defineModel("Category", categorySchema);
