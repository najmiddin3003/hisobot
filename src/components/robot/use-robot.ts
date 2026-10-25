"use client";

import { useSyncExternalStore } from "react";

// Oydin yoqilgan/o'chirilgani shu brauzerda saqlanadi (Sozlamalar → AI yordamchi)
const KEY = "hisob:robot";
const EVENT = "hisob:robot-change";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

function read() {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

/** Serverda (va birinchi chizishda) — yoqilgan deb hisoblanadi: odatiy holat shu */
export function useRobotEnabled() {
  return useSyncExternalStore(subscribe, read, () => true);
}

export function setRobotEnabled(on: boolean) {
  try {
    if (on) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, "off");
  } catch {
    // Saqlab bo'lmasa ham shu sahifada ishlasin
  }
  window.dispatchEvent(new Event(EVENT));
}
