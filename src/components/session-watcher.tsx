"use client";

import { useEffect } from "react";

const CHECK_INTERVAL_MS = 20_000;

/**
 * Bir vaqtda faqat bitta seans: boshqa qurilmadan kirilsa yoki 12 soat tugasa,
 * bu sahifa ~20 soniya ichida o'zi login sahifasiga chiqib ketadi.
 */
export function SessionWatcher() {
  useEffect(() => {
    let stopped = false;

    const check = async () => {
      if (stopped || document.visibilityState === "hidden") return;
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        if (response.status !== 401 || stopped) return;
        const { reason } = (await response.json()) as { reason: string | null };
        stopped = true;
        // To'liq qayta yuklash — xotiradagi sahifalar ham tozalanadi
        window.location.replace(reason ? `/login?sabab=${reason}` : "/login");
      } catch {
        // Internet uzilgan bo'lsa keyingi safar tekshiriladi
      }
    };

    const interval = setInterval(check, CHECK_INTERVAL_MS);
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", check);
    return () => {
      stopped = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", check);
    };
  }, []);

  return null;
}
