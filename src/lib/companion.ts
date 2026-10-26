// Oydin (yordamchi qiz) — kayfiyatlar va gap turi: sayt (brauzer) va server (AI) uchun umumiy

export const COMPANION_MOODS = [
  "idle",
  "happy",
  "excited",
  "love",
  "shy",
  "sad",
  "worried",
  "pout",
  "surprised",
  "sleepy",
  "nod",
  "wink",
  "think",
] as const;

export type CompanionMood = (typeof COMPANION_MOODS)[number];

/** Ekrandagi bitta gap va uni aytayotgandagi kayfiyat */
export type CompanionLine = { text: string; mood: CompanionMood };
