// Sayt (mijoz) va server uchun umumiy turlar — bu faylda serverga xos import bo'lmasin

export const AI_TURN_STATUSES = ["ok", "refusal", "truncated", "limit", "error", "aborted"] as const;
export type AiTurnStatus = (typeof AI_TURN_STATUSES)[number];

export const MAX_MESSAGE_LENGTH = 2000;

/** Javob bir necha qadamda yoziladi; yangi qadam matni oldingisidan bo'sh qator bilan ajraladi (server va saytda bir xil) */
export const stepSeparator = (text: string) => (text && !text.endsWith("\n") ? "\n\n" : "");

export type ChatTurn = {
  role: "user" | "assistant";
  text: string;
  tools: string[];
  status: AiTurnStatus;
  /** ISO vaqt */
  at: string;
};

export type ChatSummary = { id: string; title: string; updatedAt: string; turns: number };

/** /api/ai/chat javobi — har qatorda bitta JSON hodisa */
export type ChatStreamEvent =
  | { type: "chat"; id: string; title: string }
  | { type: "step" }
  | { type: "retry" }
  | { type: "text"; text: string }
  | { type: "tool"; name: string; label: string; progress: string }
  | { type: "done"; status: AiTurnStatus; text: string; tools: string[]; at: string; error?: string };

/** Javob to'liq bo'lmaganda matn ostida ko'rsatiladigan izoh */
export const STATUS_NOTES: Record<Exclude<AiTurnStatus, "ok">, string> = {
  error: "Javob olishda xato yuz berdi. Qayta urinib ko'ring.",
  refusal: "Bu savolga javob bera olmadim. Savolni boshqacha yozib ko'ring.",
  truncated: "Javob juda uzun bo'lib, kesilib qoldi. Savolni aniqroq qilib bering.",
  limit: "Savol juda ko'p ma'lumot talab qildi. Uni bir nechta aniqroq savolga bo'lib bering.",
  aborted: "To'xtatildi.",
};

export const QUICK_PROMPTS = [
  "Keraksiz xarajatlarim qaysilar?",
  "O'tgan oy bilan solishtir",
  "Qanday qilib tejasam bo'ladi?",
  "Qarz va kreditlarim holati qanday?",
] as const;
