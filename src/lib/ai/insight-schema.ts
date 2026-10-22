import { z } from "zod";

/** Dashboard'dagi oylik AI tahlil — model aynan shu ko'rinishda javob qaytaradi (structured output) */
export const insightSchema = z.object({
  verdict: z.enum(["good", "ok", "risky"]).describe("Overall state of the month"),
  summary: z.string().describe("Overall conclusion, 1-2 sentences in Uzbek"),
  highlights: z
    .array(
      z.object({
        tone: z.enum(["good", "warning", "bad"]),
        title: z.string().describe("Short title, a few words"),
        detail: z.string().describe("One sentence with the concrete numbers"),
      }),
    )
    .describe("3-5 most important observations"),
  cuts: z
    .array(
      z.object({
        category: z.string(),
        amount: z.number().int().describe("Amount spent on it this month, so'm"),
        reason: z.string().describe("Why it is unnecessary or can be reduced, one sentence"),
      }),
    )
    .describe("0-5 unnecessary or reducible expenses this month"),
  tips: z
    .array(
      z.object({
        title: z.string(),
        detail: z.string(),
        monthlySaving: z.number().int().describe("Estimated saving per month, so'm"),
      }),
    )
    .describe("2-4 concrete saving tips"),
});

export type Insight = z.infer<typeof insightSchema>;

/** Saytga yuboriladigan saqlangan tahlil */
export type SavedInsight = { data: Insight; generatedAt: string };
