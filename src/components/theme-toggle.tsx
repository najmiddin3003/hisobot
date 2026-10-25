"use client";

import { flushSync } from "react-dom";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ThemeName = "light" | "dark";

/**
 * Mavzuni almashtirish. Birinchi kirishda qurilma mavzusi ishlaydi; bosilgandan keyin tanlov
 * brauzerda saqlanadi. Yangi rang bosilgan joydan doira bo'lib yoyiladi (View Transitions);
 * brauzer qo'llamasa yoki "harakatni kamaytirish" yoqilgan bo'lsa — darhol almashadi.
 */
export function useThemeSwitch() {
  const { resolvedTheme, setTheme } = useTheme();

  const switchTheme = (next: ThemeName, origin?: { x: number; y: number }) => {
    const root = document.documentElement;
    const apply = () => {
      // Sinf darhol qo'yiladi — o'tish effekti yangi holatning rasmini shu zahoti oladi
      root.classList.toggle("dark", next === "dark");
      root.style.colorScheme = next;
      flushSync(() => setTheme(next));
    };

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!document.startViewTransition || reduceMotion) {
      apply();
      return;
    }

    const x = origin?.x ?? window.innerWidth / 2;
    const y = origin?.y ?? window.innerHeight / 2;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const transition = document.startViewTransition(apply);
    transition.ready
      .then(() =>
        root.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 500, easing: "cubic-bezier(0.4, 0, 0.2, 1)", pseudoElement: "::view-transition-new(root)" },
        ),
      )
      .catch(() => {});
  };

  return { theme: resolvedTheme as ThemeName | undefined, switchTheme };
}

/** Elementning markazi — doira shu nuqtadan yoyiladi */
export function centerOf(element: Element) {
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

/** Quyosh ↔ oy: bir bosishda darhol almashadi */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, switchTheme } = useThemeSwitch();

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("overflow-hidden", className)}
      aria-label="Mavzuni almashtirish"
      title="Mavzuni almashtirish"
      onClick={(e) => switchTheme(theme === "dark" ? "light" : "dark", centerOf(e.currentTarget))}
    >
      {/* Ikonka CSS orqali almashadi — server va brauzerda bir xil HTML; paydo bo'lganda aylanib kiradi */}
      <Sun className="animate-in spin-in-90 zoom-in-50 duration-500 dark:hidden" />
      <Moon className="hidden animate-in spin-in-90 zoom-in-50 duration-500 dark:block" />
    </Button>
  );
}
