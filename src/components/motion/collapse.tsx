"use client";

import { m } from "motion/react";
import { EASE_OUT } from "@/lib/motion";

const TRANSITION = { duration: 0.35, ease: EASE_OUT };

/**
 * Ro'yxat elementi: qo'shilganda balandligi ochilib paydo bo'ladi, o'chirilganda yig'ilib yo'qoladi.
 * AnimatePresence ichida ishlatiladi (initial={false} — sahifa ochilganda hammasi birdan ochilmaydi).
 * clip-path yon va tepada 6px bo'sh joy qoldiradi — kartochka chegarasi (ring) kesilib qolmaydi.
 */
export function Collapse({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <m.div
      className={className}
      style={{ clipPath: "inset(-6px -6px 0 -6px)" }}
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={TRANSITION}
    >
      {children}
    </m.div>
  );
}
