"use client";

import { LazyMotion, MotionConfig } from "motion/react";
import { SPRING } from "@/lib/motion";

const loadFeatures = () => import("./features").then((mod) => mod.default);

/**
 * Butun ilova uchun Motion: m.* komponentlar ishlaydi, imkoniyatlar kechiktirib yuklanadi.
 * reducedMotion="user" — qurilmada "harakatni kamaytirish" yoqilgan bo'lsa, siljish animatsiyalari o'chadi.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user" transition={SPRING}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
