import {
  ArrowLeftRight,
  HandCoins,
  Handshake,
  LayoutDashboard,
  Settings,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Sahifa oy bo'yicha ishlaydimi (yuqori paneldagi oy tanlagich ko'rinadi) */
  monthly?: boolean;
};

export const MAIN_NAV: NavItem[] = [
  {
    href: "/",
    label: "Dashboard",
    description: "Oylik moliyaviy holatingiz bir qarashda",
    icon: LayoutDashboard,
    monthly: true,
  },
  {
    href: "/kirim-chiqim",
    label: "Kirim-chiqim",
    description: "Barcha kirim va chiqimlar sana-vaqti bilan",
    icon: ArrowLeftRight,
    monthly: true,
  },
  {
    href: "/budjet",
    label: "Budjet",
    description: "Hozir qancha pulingiz bor va jamg'arma qanday o'syapti",
    icon: Wallet,
  },
];

export const DEBT_NAV: NavItem[] = [
  {
    href: "/qarzlar",
    label: "Qarzlar",
    description: "Siz qarzdor bo'lganlar: odamlardan olingan qarzlar va kreditlar",
    icon: HandCoins,
  },
  {
    href: "/xaq",
    label: "Xaq",
    description: "Sizga qarzdor bo'lganlar: siz bergan qarzlar",
    icon: Handshake,
  },
];

export const SETTINGS_NAV: NavItem = {
  href: "/sozlamalar",
  label: "Sozlamalar",
  description: "Kategoriyalar, hamyonlar, xavfsizlik va seanslar",
  icon: Settings,
};

export const ALL_NAV = [...MAIN_NAV, ...DEBT_NAV, SETTINGS_NAV];

export function findNavItem(pathname: string) {
  return ALL_NAV.find((item) =>
    item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
}
