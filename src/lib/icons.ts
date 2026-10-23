import {
  Baby,
  Banknote,
  BookOpen,
  BriefcaseBusiness,
  Bus,
  Car,
  Cigarette,
  CirclePlus,
  Coffee,
  Coins,
  CreditCard,
  Dumbbell,
  Ellipsis,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  HandCoins,
  Handshake,
  HeartPulse,
  House,
  Landmark,
  Lightbulb,
  PawPrint,
  Pill,
  Pizza,
  Plane,
  Receipt,
  Scissors,
  Shirt,
  ShoppingBasket,
  Smartphone,
  TrendingUp,
  UtensilsCrossed,
  Vault,
  Wallet,
  Wifi,
  Wrench,
  type LucideIcon,
} from "lucide-react";

/** Kategoriya va hamyonlar uchun tanlash mumkin bo'lgan ikonkalar (DB'da nomi saqlanadi) */
export const ICONS = {
  Baby,
  Banknote,
  BookOpen,
  BriefcaseBusiness,
  Bus,
  Car,
  Cigarette,
  CirclePlus,
  Coffee,
  Coins,
  CreditCard,
  Dumbbell,
  Ellipsis,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  HandCoins,
  Handshake,
  HeartPulse,
  House,
  Landmark,
  Lightbulb,
  PawPrint,
  Pill,
  Pizza,
  Plane,
  Receipt,
  Scissors,
  Shirt,
  ShoppingBasket,
  Smartphone,
  TrendingUp,
  UtensilsCrossed,
  Vault,
  Wallet,
  Wifi,
  Wrench,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export const ICON_NAMES = Object.keys(ICONS) as IconName[];

export const isIconName = (name: string): name is IconName => Object.hasOwn(ICONS, name);

/** Ro'yxatdan olib tashlangan, lekin bazada qolgan bo'lishi mumkin bo'lgan nomlar */
const RENAMED: Record<string, IconName> = { PiggyBank: "Vault" };

export function getIcon(name: string): LucideIcon {
  if (isIconName(name)) return ICONS[name];
  return name in RENAMED ? ICONS[RENAMED[name]] : Ellipsis;
}
