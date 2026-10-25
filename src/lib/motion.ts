import type { Transition } from "motion/react";

/** Asosiy prujina: tez, lekin ortiqcha tebranishsiz */
export const SPRING: Transition = { type: "spring", stiffness: 520, damping: 40, mass: 0.8 };

/** Yumshoq to'xtash (expo-out) — paydo bo'lish va balandlik o'zgarishlari uchun */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
