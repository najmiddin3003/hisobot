"use client";

import { m } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Tanlangan element orqasidagi fon. Bir guruhdagi barcha elementlar bitta layoutId bilan
 * chizadi — tanlov o'zgarganda fon eski joydan yangisiga sirpanib o'tadi.
 * Ota element `relative` bo'lishi, matn esa `relative` (fon ustida) turishi kerak.
 */
export function ActivePill({ layoutId, className }: { layoutId: string; className?: string }) {
  return (
    <m.span
      layoutId={layoutId}
      aria-hidden
      className={cn("absolute inset-0 bg-primary", className)}
      // Radius style orqali — layout animatsiyasida Motion uni cho'zilib ketishdan saqlaydi
      style={{ borderRadius: 9999 }}
    />
  );
}
