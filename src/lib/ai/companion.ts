import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { after } from "next/server";
import { z } from "zod";
import { COMPANION_MOODS, type CompanionLine } from "@/lib/companion";
import { loadDebtOverview } from "@/lib/data/debts";
import { currentMonthKey, dayKey, fromDateInput, monthRange, shiftMonth } from "@/lib/dates";
import { Category, CompanionCache, Goal, Transaction } from "@/lib/models";
import { formatCompact } from "@/lib/money";
import { AI_MODEL, aiConfigured, commonParams, getAnthropic } from "./client";
import { COMPANION_SYSTEM_PROMPT, contextLine } from "./prompt";

// Oydin gaplari: AI kaliti bo'lsa — Claude foydalanuvchining ma'lumotlariga qarab yozadi (bir necha soatda bir marta),
// bo'lmasa yoki xato bo'lsa — shu ma'lumotlardan tayyor andozalar bilan.

/** AI gaplari shuncha vaqt ishlatiladi (kun almashsa — darhol yangilanadi) */
const AI_TTL_MS = 3 * 60 * 60 * 1000;
/** AI xato bersa, shuncha vaqt qayta urinilmaydi */
const RETRY_AFTER_MS = 30 * 60 * 1000;
const CACHE_KEY = "lines";

type Facts = Awaited<ReturnType<typeof loadFacts>>;

/** Gaplar uchun faktlar: shu oy natijasi, bugungi chiqim, eng katta xarajat, maqsadlar va yaqin to'lov */
async function loadFacts(now: Date) {
  const month = currentMonthKey(now);
  const { start, end } = monthRange(month);
  const { start: prevStart } = monthRange(shiftMonth(month, -1));
  const today = fromDateInput(dayKey(now)) ?? start;
  const expense = { deletedAt: null, type: "chiqim" };

  const [byType, prev, todayRows, top, goals, debts] = await Promise.all([
    Transaction.aggregate<{ _id: "kirim" | "chiqim"; total: number }>([
      { $match: { deletedAt: null, occurredAt: { $gte: start, $lt: end } } },
      { $group: { _id: "$type", total: { $sum: "$amount" } } },
    ]),
    Transaction.aggregate<{ total: number }>([
      { $match: { ...expense, occurredAt: { $gte: prevStart, $lt: start } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Transaction.aggregate<{ total: number }>([
      { $match: { ...expense, occurredAt: { $gte: today } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    // Qarz bilan bog'liq bo'lmagan eng katta xarajat kategoriyasi
    Transaction.aggregate<{ total: number; category: { name: string }[] }>([
      { $match: { ...expense, debtId: null, occurredAt: { $gte: start, $lt: end } } },
      { $group: { _id: "$categoryId", total: { $sum: "$amount" } } },
      { $sort: { total: -1 } },
      { $limit: 1 },
      { $lookup: { from: Category.collection.name, localField: "_id", foreignField: "_id", as: "category", pipeline: [{ $project: { name: 1 } }] } },
    ]),
    Goal.find({}, { name: 1, targetAmount: 1, savedAmount: 1 }).sort({ order: 1 }).lean(),
    loadDebtOverview(now),
  ]);

  const income = byType.find((r) => r._id === "kirim")?.total ?? 0;
  const spent = byType.find((r) => r._id === "chiqim")?.total ?? 0;
  const next = debts.upcoming[0];
  return {
    income,
    expense: spent,
    keptPercent: income > 0 ? Math.round(((income - spent) / income) * 100) : null,
    prevExpense: prev[0]?.total ?? 0,
    spentToday: todayRows[0]?.total ?? 0,
    topCategory: top[0]?.category[0] ? { name: top[0].category[0].name, amount: top[0].total } : null,
    goals: goals.map((g) => ({
      name: g.name,
      percent: Math.min(Math.round((g.savedAmount / g.targetAmount) * 100), 100),
      remaining: Math.max(g.targetAmount - g.savedAmount, 0),
    })),
    nextPayment: next ? { counterparty: next.counterparty, daysToDue: next.daysToDue, overdue: next.overdue, amount: next.amount } : null,
  };
}

/** AI'siz: faktlardan Oydin ohangidagi gaplar */
function localLines(f: Facts): CompanionLine[] {
  const lines: CompanionLine[] = [];
  if (f.keptPercent !== null && f.keptPercent > 0) {
    lines.push(
      f.keptPercent >= 20
        ? { mood: "excited", text: `Jonim, bu oy kirimning ${f.keptPercent}% qismi tejaldi! Faxrlanaman 🥳` }
        : { mood: "happy", text: `Bu oy kirimning ${f.keptPercent}% qismi tejaldi, asalim. Yaxshi ketyapmiz 💪` },
    );
  } else if (f.income > 0 && f.expense > f.income) {
    lines.push({ mood: "worried", text: "Asalim, bu oy chiqim kirimdan oshib ketdi... xavotirdaman 🥺 Birga tejaymizmi?" });
  }
  lines.push(
    f.spentToday > 0
      ? { mood: "nod", text: `Bugun ${formatCompact(f.spentToday)} so'm sarflading, jonim. Hammasi yozilgan ✍️` }
      : { mood: "happy", text: "Bugun hali hech narsa sarflamading — barakalla, asalim! ✨" },
  );
  if (f.topCategory) {
    lines.push({
      mood: "think",
      text: `Bu oy eng ko'p pul «${f.topCategory.name}»ga ketdi — ${formatCompact(f.topCategory.amount)} so'm. Biroz kamaytiramizmi? 🤔`,
    });
  }
  const open = f.goals.filter((g) => g.remaining > 0).sort((a, b) => b.percent - a.percent)[0];
  if (open) lines.push({ mood: "love", text: `«${open.name}» orzuimizga ${open.percent}% yig'ildi, yana ${formatCompact(open.remaining)} qoldi 💕` });
  const done = f.goals.find((g) => g.remaining === 0);
  if (done) lines.push({ mood: "excited", text: `«${done.name}» maqsadiga yetding! Tabriklayman, jonim! 🎉` });
  if (f.nextPayment?.overdue) {
    lines.push({ mood: "worried", text: `${f.nextPayment.counterparty} bilan to'lov muddati o'tib ketdi, jonim. Unutmaylik 🥺` });
  } else if (f.nextPayment && f.nextPayment.daysToDue <= 3) {
    lines.push({
      mood: "think",
      text:
        f.nextPayment.daysToDue === 0
          ? `Bugun ${f.nextPayment.counterparty} bilan to'lov kuni, asalim 📅`
          : `${f.nextPayment.daysToDue} kundan keyin ${f.nextPayment.counterparty} bilan to'lov bor, asalim 📅`,
    });
  }
  return lines;
}

/** AI'ga beriladigan faktlar — summalar qisqa ko'rinishda ("1,2 mln") */
function factsForAi(f: Facts) {
  return {
    buOy: { kirim: formatCompact(f.income), chiqim: formatCompact(f.expense), tejalganFoiz: f.keptPercent },
    otganOyChiqim: formatCompact(f.prevExpense),
    bugungiChiqim: formatCompact(f.spentToday),
    engKopXarajat: f.topCategory ? { kategoriya: f.topCategory.name, summa: formatCompact(f.topCategory.amount) } : null,
    maqsadlar: f.goals.map((g) => ({ nomi: g.name, yigildiFoiz: g.percent, qoldi: formatCompact(g.remaining) })),
    yaqinTolov: f.nextPayment
      ? {
          kim: f.nextPayment.counterparty,
          kunQoldi: f.nextPayment.daysToDue,
          muddatiOtgan: f.nextPayment.overdue,
          summa: formatCompact(f.nextPayment.amount),
        }
      : null,
  };
}

const linesSchema = z.object({
  lines: z
    .array(
      z.object({
        mood: z.enum(COMPANION_MOODS).describe("Oydin's mood while saying the line"),
        text: z.string().describe("One short line in Uzbek (Latin script), at most 90 characters, at most one emoji"),
      }),
    )
    .describe("12 varied lines"),
});

let inflight: Promise<void> | null = null;
let failedAt = 0;

async function generate(facts: Facts, now: Date) {
  try {
    const message = await getAnthropic().beta.messages.parse({
      ...commonParams,
      max_tokens: 6000,
      output_config: { effort: "low", format: betaZodOutputFormat(linesSchema) },
      system: COMPANION_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `<kontekst>${contextLine(now)}</kontekst>\n<faktlar>${JSON.stringify(factsForAi(facts))}</faktlar>\n\nOydin uchun yangi gaplar yoz.`,
        },
      ],
    });
    const lines = (message.parsed_output?.lines ?? [])
      .map((line) => ({ mood: line.mood, text: line.text.trim() }))
      .filter((line) => line.text.length > 0 && line.text.length <= 140);
    if (message.stop_reason === "refusal" || message.stop_reason === "max_tokens" || lines.length < 4) {
      throw new Error(`AI gaplari yaroqsiz (${message.stop_reason}, ${lines.length} ta)`);
    }
    await CompanionCache.updateOne(
      { key: CACHE_KEY },
      { $set: { lines, day: dayKey(now), aiModel: AI_MODEL, generatedAt: new Date() } },
      { upsert: true },
    );
  } catch (error) {
    failedAt = Date.now();
    console.error("Oydin gaplarini AI'dan olib bo'lmadi:", error instanceof Anthropic.APIError ? error.message : error);
  }
}

/**
 * Oydin aytadigan gaplar. AI ulangan bo'lsa — saqlangan AI gaplari; eskirgan bo'lsa yangisi fonda yoziladi
 * (javob kutib qolmaydi, pending: true — sayt birozdan keyin qayta so'raydi). Seans chaqiruvchi tomonda tekshiriladi.
 */
export async function companionLines(): Promise<{ lines: CompanionLine[]; source: "ai" | "local"; pending: boolean }> {
  const now = new Date();
  const [facts, cached] = await Promise.all([
    loadFacts(now),
    aiConfigured() ? CompanionCache.findOne({ key: CACHE_KEY }).lean() : null,
  ]);
  const local = localLines(facts);
  if (!aiConfigured()) return { lines: local, source: "local", pending: false };

  // Bugun yozilgan AI gaplari bo'lsa — ular (kecha yozilganlari "bugun" haqida noto'g'ri gapirishi mumkin)
  const today = cached && cached.day === dayKey(now) ? (cached.lines as CompanionLine[]) : null;
  const fresh = today && now.getTime() - cached!.generatedAt.getTime() < AI_TTL_MS;
  if (fresh || Date.now() - failedAt < RETRY_AFTER_MS) {
    return { lines: today ?? local, source: today ? "ai" : "local", pending: false };
  }

  if (!inflight) {
    inflight = generate(facts, now).finally(() => {
      inflight = null;
    });
    // Javob yuborilgandan keyin ham funksiya AI javobini kutib, saqlab qo'yadi
    const pending = inflight;
    try {
      after(() => pending);
    } catch {
      // So'rovdan tashqarida (skript, test) — shunchaki fonda tugaydi
    }
  }
  return { lines: today ?? local, source: today ? "ai" : "local", pending: true };
}
