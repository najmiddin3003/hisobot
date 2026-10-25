"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ActivePill } from "@/components/motion/active-pill";
import { DEBT_NAV, MAIN_NAV, findNavItem, type NavItem } from "@/lib/nav";
import { cn } from "@/lib/utils";

const [DASHBOARD, ENTRIES, BUDGET] = MAIN_NAV;
const [DEBTS, RECEIVABLES] = DEBT_NAV;

/**
 * Telefon va planshetda pastki panel: 4 ta bo'lim va o'rtada yangi yozuv tugmasi.
 * Xaq sahifasi ham "Qarzlar" ostida — u yerdan ikkalasi orasida almashish mumkin.
 */
export function BottomNav({ quickAdd }: { quickAdd: React.ReactNode }) {
  const current = findNavItem(usePathname())?.href;
  const activeHref = current === RECEIVABLES.href ? DEBTS.href : current;

  return (
    <nav
      aria-label="Bo'limlar"
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <div className="mx-auto grid h-16 max-w-lg grid-cols-5 items-center px-1">
        <Tab item={DASHBOARD} active={activeHref === DASHBOARD.href} />
        <Tab item={ENTRIES} active={activeHref === ENTRIES.href} />
        <div className="flex justify-center">{quickAdd}</div>
        <Tab item={BUDGET} active={activeHref === BUDGET.href} />
        <Tab item={DEBTS} active={activeHref === DEBTS.href} />
      </div>
    </nav>
  );
}

function Tab({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-w-0 flex-col items-center gap-1 text-[11px] leading-none font-medium transition-[color,transform] duration-200 active:scale-95",
        active ? "text-foreground" : "text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "relative flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-200",
          active && "text-primary-foreground",
        )}
      >
        {active && <ActivePill layoutId="bottom-nav" />}
        <item.icon className="relative size-4.5" />
      </span>
      <span className="max-w-full truncate px-0.5">{item.label}</span>
    </Link>
  );
}
