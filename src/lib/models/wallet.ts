import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { WALLET_KINDS } from "@/lib/domain";

const walletSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    kind: { type: String, enum: WALLET_KINDS, required: true, default: "naqd" },
    /** Tizimni boshlagandagi qoldiq; joriy qoldiq = shu + kirimlar − chiqimlar ± o'tkazmalar */
    initialBalance: {
      type: Number,
      default: 0,
      validate: { validator: Number.isInteger, message: "Qoldiq butun son bo'lishi kerak" },
    },
    color: { type: String, default: "#6366f1" },
    icon: { type: String, default: "Wallet" },
    order: { type: Number, default: 0 },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type WalletDoc = InferSchemaType<typeof walletSchema>;
export const Wallet = (models.Wallet as Model<WalletDoc>) ?? model("Wallet", walletSchema);
