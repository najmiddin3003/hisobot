import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { monthLabel, monthRange, shiftMonth } from "@/lib/dates";
import { AiInsight, Transaction } from "@/lib/models";
import { AI_MODEL, aiConfigured, aiErrorMessage, commonParams, getAnthropic } from "./client";
import { budgetState, countMonthEntries, debtsState, monthSummary, monthsTrend, recurringState } from "./data";
import { insightSchema, type Insight, type SavedInsight } from "./insight-schema";
import { INSIGHT_SYSTEM_PROMPT, contextLine } from "./prompt";

const TREND_MONTHS = 6;

/** Dashboard uchun: oyning saqlangan tahlili va undan keyin nechta yozuv qo'shilgan/o'zgargani (seans tekshirilgan) */
export async function loadInsight(month: string) {
  const saved = await AiInsight.findOne({ month }).lean();
  const { start, end } = monthRange(month);
  const changedSince = saved
    ? await Transaction.countDocuments({
        occurredAt: { $gte: start, $lt: end },
        updatedAt: { $gt: saved.generatedAt },
      })
    : 0;
  return {
    configured: aiConfigured(),
    insight: saved ? ({ data: saved.data as Insight, generatedAt: saved.generatedAt.toISOString() } satisfies SavedInsight) : null,
    changedSince,
  };
}

type GenerateResult = { ok: true; insight: SavedInsight } | { ok: false; error: string; status: number };

/** Oyni tahlil qiladi va natijani saqlaydi (oldingi tahlil almashtiriladi) */
export async function generateInsight(month: string, now: Date): Promise<GenerateResult> {
  if ((await countMonthEntries(month)) === 0) {
    return { ok: false, status: 400, error: `${monthLabel(month)} oyida hali yozuv yo'q — tahlil qilishga ma'lumot kerak.` };
  }

  const [summary, trend, recurring, debts, budget] = await Promise.all([
    monthSummary(month, now),
    monthsTrend(month, TREND_MONTHS),
    recurringState(),
    debtsState(now),
    budgetState(now),
  ]);
  const prev = monthLabel(shiftMonth(month, -1));

  const content = [
    `<kontekst>${contextLine(now)}</kontekst>`,
    `${monthLabel(month)} oyini tahlil qiling: o'tgan oy (${prev}) bilan taqqoslang, keraksiz xarajatlarni toping va tejash bo'yicha aniq maslahat bering.`,
    `<oy_hisoboti>${JSON.stringify(summary)}</oy_hisoboti>`,
    `<oxirgi_${TREND_MONTHS}_oy>${JSON.stringify(trend)}</oxirgi_${TREND_MONTHS}_oy>`,
    `<takroriy_tolovlar>${JSON.stringify(recurring)}</takroriy_tolovlar>`,
    `<qarzlar>${JSON.stringify(debts)}</qarzlar>`,
    `<budjet>${JSON.stringify(budget)}</budjet>`,
  ].join("\n\n");

  let message;
  try {
    message = await getAnthropic().beta.messages.parse({
      ...commonParams,
      max_tokens: 16_000,
      output_config: { effort: "medium", format: betaZodOutputFormat(insightSchema) },
      system: INSIGHT_SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
    });
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      return { ok: false, status: 502, error: aiErrorMessage(error) ?? "So'rov bekor qilindi" };
    }
    // Javob sxemaga mos kelmadi
    console.error("AI tahlilini o'qib bo'lmadi:", error);
    return { ok: false, status: 502, error: "AI javobini o'qib bo'lmadi. Qayta urinib ko'ring." };
  }

  if (message.stop_reason === "refusal") {
    return { ok: false, status: 422, error: "AI bu oyni tahlil qila olmadi. Birozdan keyin qayta urinib ko'ring." };
  }
  const data = message.parsed_output;
  if (!data || message.stop_reason === "max_tokens") {
    return { ok: false, status: 502, error: "AI javobi to'liq kelmadi. Qayta urinib ko'ring." };
  }

  const generatedAt = new Date();
  await AiInsight.updateOne({ month }, { $set: { data, aiModel: AI_MODEL, generatedAt } }, { upsert: true });
  return { ok: true, insight: { data, generatedAt: generatedAt.toISOString() } };
}
