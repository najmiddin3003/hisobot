import {
  Banknote,
  BriefcaseBusiness,
  Car,
  CirclePlus,
  CreditCard,
  Ellipsis,
  Gamepad2,
  Gift,
  GraduationCap,
  HandCoins,
  Handshake,
  HeartPulse,
  House,
  Landmark,
  Lightbulb,
  PiggyBank,
  Receipt,
  Shirt,
  ShoppingBasket,
  Smartphone,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from "lucide-react";

/** Kategoriya va hamyonlar uchun tanlash mumkin bo'lgan ikonkalar (DB'da nomi saqlanadi) */
export const ICONS = {
  Banknote,
  BriefcaseBusiness,
  Car,
  CirclePlus,
  CreditCard,
  Ellipsis,
  Gamepad2,
  Gift,
  GraduationCap,
  HandCoins,
  Handshake,
  HeartPulse,
  House,
  Landmark,
  Lightbulb,
  PiggyBank,
  Receipt,
  Shirt,
  ShoppingBasket,
  Smartphone,
  UtensilsCrossed,
  Wallet,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export function getIcon(name: string): LucideIcon {
  return ICONS[name as IconName] ?? Ellipsis;
}
