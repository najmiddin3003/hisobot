import "server-only";
import Anthropic from "@anthropic-ai/sdk";

export const AI_MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

/** Kalit .env faylida bo'lmasa AI o'chiq turadi (sayt qolgan qismi ishlayveradi) */
export function aiConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

export const NOT_CONFIGURED_MESSAGE =
  "AI yordamchi hali ulanmagan: .env.local faylidagi ANTHROPIC_API_KEY qatoriga Claude API kalitini yozing va saytni qayta ishga tushiring.";

let client: Anthropic | null = null;

export function getAnthropic() {
  // Vercel funksiyasi 300 soniyada to'xtatiladi — so'rov undan oldin tugashi kerak
  client ??= new Anthropic({ maxRetries: 2, timeout: 240_000 });
  return client;
}

/**
 * Har bir so'rovga qo'shiladigan umumiy sozlamalar:
 * - fallbacks: "default" — xavfsizlik filtri so'rovni noto'g'ri rad etsa, Anthropic tavsiya qilgan boshqa modelda qayta ishlaydi;
 * - drop_block — saqlangan suhbatdagi eski "thinking" bloklari (masalan, prompt yangilanganidan keyin) xato bermasdan tashlab yuboriladi.
 */
export const commonParams = {
  model: AI_MODEL,
  betas: ["server-side-fallback-2026-07-01", "thinking-binding-controls-2026-08-01"],
  fallbacks: "default",
  thinking: { type: "adaptive", block_binding: { prefix_mismatch_behavior: "drop_block" } },
} satisfies Partial<Anthropic.Beta.Messages.MessageCreateParamsNonStreaming>;

/** Foydalanuvchiga ko'rsatiladigan xato matni; so'rov bekor qilingan bo'lsa null */
export function aiErrorMessage(error: unknown): string | null {
  if (error instanceof Anthropic.APIUserAbortError) return null;
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    return "Claude API kaliti noto'g'ri yoki ruxsati yo'q. .env.local dagi ANTHROPIC_API_KEY ni tekshiring.";
  }
  if (error instanceof Anthropic.RateLimitError) return "So'rovlar juda ko'p. Bir daqiqadan keyin qayta urinib ko'ring.";
  if (error instanceof Anthropic.APIConnectionTimeoutError) return "Claude javob berishga ulgurmadi. Qayta urinib ko'ring.";
  if (error instanceof Anthropic.APIConnectionError) return "Claude API'ga ulanib bo'lmadi. Internetni tekshiring.";
  if (error instanceof Anthropic.InternalServerError) return "Claude hozir band. Birozdan keyin qayta urinib ko'ring.";
  if (error instanceof Anthropic.BadRequestError) {
    console.error("Claude API so'rov xatosi:", error.message);
    return "Claude so'rovni qabul qilmadi. Yangi suhbat boshlab ko'ring.";
  }
  console.error("AI xatosi:", error);
  return "Kutilmagan xato yuz berdi. Qayta urinib ko'ring.";
}
