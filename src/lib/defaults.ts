import type { IconName } from "@/lib/icons";
import type { SystemCategoryKey, TxType, WalletKind } from "@/lib/domain";

type DefaultCategory = {
  name: string;
  type: TxType;
  icon: IconName;
  color: string;
  keywords?: string[];
  systemKey?: SystemCategoryKey;
};

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  // ---- Chiqim ----
  {
    name: "Oziq-ovqat",
    type: "chiqim",
    icon: "ShoppingBasket",
    color: "#16a34a",
    keywords: ["non", "go'sht", "bozor", "market", "korzinka", "makro", "havas", "sut", "meva", "sabzavot", "oziq"],
  },
  {
    name: "Kafe va restoran",
    type: "chiqim",
    icon: "UtensilsCrossed",
    color: "#ea580c",
    keywords: ["kafe", "restoran", "kofe", "osh", "lavash", "burger", "choyxona", "evos", "somsa", "tushlik"],
  },
  {
    name: "Transport",
    type: "chiqim",
    icon: "Car",
    color: "#2563eb",
    keywords: ["taksi", "yandex", "metro", "avtobus", "benzin", "propan", "metan", "yoqilg'i", "moyka", "parkovka"],
  },
  {
    name: "Kommunal",
    type: "chiqim",
    icon: "Lightbulb",
    color: "#ca8a04",
    keywords: ["svet", "gaz", "suv", "kommunal", "elektr", "issiqlik", "chiqindi"],
  },
  {
    name: "Aloqa va internet",
    type: "chiqim",
    icon: "Smartphone",
    color: "#0891b2",
    keywords: ["telefon", "internet", "paynet", "beeline", "ucell", "uzmobile", "mobiuz", "uztelecom"],
  },
  {
    name: "Uy-ro'zg'or",
    type: "chiqim",
    icon: "House",
    color: "#9333ea",
    keywords: ["ijara", "uy", "mebel", "tozalash", "ro'zg'or", "idish"],
  },
  {
    name: "Kiyim-kechak",
    type: "chiqim",
    icon: "Shirt",
    color: "#db2777",
    keywords: ["kiyim", "oyoq kiyim", "krossovka", "ko'ylak", "shim", "kurtka"],
  },
  {
    name: "Sog'liq",
    type: "chiqim",
    icon: "HeartPulse",
    color: "#dc2626",
    keywords: ["dori", "apteka", "dorixona", "shifoxona", "doktor", "klinika", "tish"],
  },
  {
    name: "Ta'lim",
    type: "chiqim",
    icon: "GraduationCap",
    color: "#4f46e5",
    keywords: ["kurs", "kitob", "kontrakt", "o'qish", "repetitor"],
  },
  {
    name: "Ko'ngilochar",
    type: "chiqim",
    icon: "Gamepad2",
    color: "#7c3aed",
    keywords: ["kino", "o'yin", "obuna", "netflix", "spotify", "dam olish"],
  },
  {
    name: "Sovg'a va yordam",
    type: "chiqim",
    icon: "Gift",
    color: "#e11d48",
    keywords: ["sovg'a", "to'y", "tug'ilgan kun", "yordam", "sadaqa"],
  },
  { name: "Boshqa", type: "chiqim", icon: "Ellipsis", color: "#64748b" },

  // ---- Kirim ----
  { name: "Oylik", type: "kirim", icon: "Banknote", color: "#059669", systemKey: "oylik", keywords: ["oylik", "maosh"] },
  {
    name: "Qo'shimcha daromad",
    type: "kirim",
    icon: "BriefcaseBusiness",
    color: "#0d9488",
    keywords: ["bonus", "freelance", "qo'shimcha", "premiya"],
  },
  { name: "Sovg'a", type: "kirim", icon: "Gift", color: "#d946ef" },
  { name: "Boshqa kirim", type: "kirim", icon: "CirclePlus", color: "#64748b" },

  // ---- Qarz va kredit (tizim kategoriyalari) ----
  { name: "Qarz olindi", type: "kirim", icon: "HandCoins", color: "#d97706", systemKey: "qarz_olindi" },
  { name: "Qarz qaytarildi", type: "kirim", icon: "Handshake", color: "#0284c7", systemKey: "qarz_qaytarildi" },
  { name: "Kredit olindi", type: "kirim", icon: "Landmark", color: "#d97706", systemKey: "kredit_olindi" },
  { name: "Qarz berildi", type: "chiqim", icon: "Handshake", color: "#0284c7", systemKey: "qarz_berildi" },
  { name: "Qarzni qaytardim", type: "chiqim", icon: "HandCoins", color: "#d97706", systemKey: "qarz_qaytardim" },
  { name: "Kredit to'lovi", type: "chiqim", icon: "Landmark", color: "#b45309", systemKey: "kredit_tolovi" },
];

type DefaultWallet = { name: string; kind: WalletKind; icon: IconName; color: string };

export const DEFAULT_WALLETS: DefaultWallet[] = [
  { name: "Naqd", kind: "naqd", icon: "Banknote", color: "#16a34a" },
  { name: "Uzcard", kind: "karta", icon: "CreditCard", color: "#2563eb" },
  { name: "Humo", kind: "karta", icon: "CreditCard", color: "#ea580c" },
];
