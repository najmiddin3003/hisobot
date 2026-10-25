"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Coins, Sparkles } from "lucide-react";
import { openAssistant } from "@/components/ai/open-assistant";
import { ActivePill } from "@/components/motion/active-pill";
import { MonthPicker, MonthPickerFallback } from "@/components/month-picker";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { DEBT_NAV, MAIN_NAV, findNavItem } from "@/lib/nav";
import { cn } from "@/lib/utils";

const TOP_NAV = [...MAIN_NAV, ...DEBT_NAV];

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex shrink-0 items-center gap-2", className)} aria-label="Hisob — Dashboard">
      <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Coins className="size-4" />
      </span>
      <span className="hidden font-heading text-xl font-medium tracking-[-0.02em] sm:inline">Hisob</span>
    </Link>
  );
}

/**
 * Yuqori panel. Kompyuterda (lg+) bo'limlar shu yerda — tabletka ko'rinishidagi tugmalar;
 * telefonda bo'limlar pastki panelda, bu yerda faqat oy tanlagich, AI va akkaunt menyusi.
 * quickAdd va userMenu — serverda tayyorlanadigan qismlar (Suspense ichida).
 */
export function AppHeader({ quickAdd, userMenu }: { quickAdd: React.ReactNode; userMenu: React.ReactNode }) {
  const activeHref = findNavItem(usePathname())?.href;

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 md:px-6 lg:px-8">
        <Logo />

        <nav aria-label="Bo'limlar" className="ml-4 hidden items-center gap-1 lg:flex">
          {TOP_NAV.map((item) => {
            const active = item.href === activeHref;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors duration-200",
                  active ? "text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {/* Tanlangan bo'lim foni bir tugmadan ikkinchisiga sirpanib o'tadi */}
                {active && <ActivePill layoutId="top-nav" />}
                <span className="relative">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
          <Suspense fallback={<MonthPickerFallback />}>
            <MonthPicker />
          </Suspense>
          <div className="hidden lg:block">{quickAdd}</div>
          {/* Telefonda AI tugmasi shu yerda — pastki o'ng burchak pastki panel bilan band */}
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => openAssistant()} aria-label="AI yordamchi">
            <Sparkles />
          </Button>
          <ThemeToggle />
          {userMenu}
        </div>
      </div>
    </header>
  );
}
