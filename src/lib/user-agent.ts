import { userAgentFromString } from "next/server";

/** "Chrome · Windows" yoki "Safari · iOS (mobil)" */
export function describeUserAgent(ua: string) {
  if (!ua) return "Noma'lum qurilma";
  const { browser, os, device } = userAgentFromString(ua);
  const parts = [browser.name, os.name].filter(Boolean);
  const label = parts.length ? parts.join(" · ") : "Noma'lum qurilma";
  return device.type === "mobile" ? `${label} (mobil)` : device.type === "tablet" ? `${label} (planshet)` : label;
}
