import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { currentMonthKey, fromDateInput } from "@/lib/dates";
import { budgetState, debtsState, monthSummary, monthsTrend, recurringState, searchEntries } from "./data";

// AI faqat shu vositalar orqali ma'lumot oladi. Hammasi faqat o'qiydi — yozish, o'zgartirish yoki o'chirish yo'q.

const monthKey = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Oy YYYY-MM ko'rinishida bo'lishi kerak")
  .describe('Month key "YYYY-MM" (Tashkent calendar), e.g. "2026-10"');
const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Sana YYYY-MM-DD ko'rinishida bo'lishi kerak");

type ToolContext = { now: Date };

type ToolSpec<S extends z.ZodType> = {
  description: string;
  input: S;
  /** Javob ostida ko'rsatiladigan qisqa nom */
  label: string;
  /** Vosita ishlayotganda ko'rinadigan matn */
  progress: string;
  run: (input: z.infer<S>, ctx: ToolContext) => Promise<unknown>;
};

const defineTool = <S extends z.ZodType>(spec: ToolSpec<S>) => spec;

/** Kelajakdagi oy so'ralsa — joriy oy */
const notFuture = (month: string, now: Date) => {
  const current = currentMonthKey(now);
  return month > current ? current : month;
};

const TOOLS = {
  get_month_summary: defineTool({
    label: "Oylik hisobot",
    progress: "Oylik hisobot o'qilmoqda",
    description:
      "Full report for one calendar month: income and expense totals (expense split into regular spending vs. debt/credit " +
      "flows), every expense and income category with amount, count, share and change vs. the previous month, totals per " +
      "wallet, daily average and the 10 largest expenses with date, time and note. Start here for most questions about a month.",
    input: z.object({ month: monthKey }),
    run: ({ month }, { now }) => monthSummary(notFuture(month, now), now),
  }),

  compare_months: defineTool({
    label: "Oylar taqqoslash",
    progress: "Oylar taqqoslanmoqda",
    description:
      "Month-by-month income, expense (total and regular, i.e. without debt/credit flows) and net for several months " +
      "ending at end_month, plus the biggest regular expense categories broken down by month. Use for trends and " +
      "comparisons across months.",
    input: z.object({
      end_month: monthKey,
      months: z.number().int().min(2).max(24).describe("How many months to include, ending at end_month (2-24)"),
    }),
    run: ({ end_month, months }, { now }) => monthsTrend(notFuture(end_month, now), months),
  }),

  search_entries: defineTool({
    label: "Yozuvlar qidiruvi",
    progress: "Yozuvlar qidirilmoqda",
    description:
      "Find individual income/expense entries. Filter by month or date range, type, category name (partial match), text " +
      "in the note (e.g. 'taksi', 'kofe') and minimum amount. Returns the matched count and sums over ALL matches plus " +
      "the newest entries (date, time, amount, category, wallet, note, source). Amounts are in so'm; entries from a " +
      "foreign-currency wallet also carry amountInCurrency. Use it to dig into a category or habit.",
    input: z.object({
      month: monthKey.optional(),
      from: dateKey.optional().describe("Start date YYYY-MM-DD, inclusive"),
      to: dateKey.optional().describe("End date YYYY-MM-DD, inclusive"),
      type: z.enum(["kirim", "chiqim"]).optional().describe("kirim = income, chiqim = expense"),
      category: z.string().max(60).optional().describe("Category name or part of it, e.g. 'Oziq-ovqat'"),
      text: z.string().max(60).optional().describe("Text to look for in the entry note"),
      min_amount: z.number().int().positive().optional().describe("Only entries of at least this many so'm"),
      limit: z.number().int().min(1).max(100).optional().describe("How many entries to list (default 30, max 100)"),
    }),
    run: (input) => {
      const from = input.from ? fromDateInput(input.from) : null;
      const toDay = input.to ? fromDateInput(input.to) : null;
      if ((input.from && !from) || (input.to && !toDay)) return Promise.resolve({ error: "Sana noto'g'ri" });
      return searchEntries({
        month: input.month,
        from: from ?? undefined,
        // "to" kuni ham kiradi
        to: toDay ? new Date(toDay.getTime() + 24 * 60 * 60 * 1000) : undefined,
        type: input.type,
        category: input.category,
        text: input.text,
        minAmount: input.min_amount,
        limit: input.limit ?? 30,
      });
    },
  }),

  get_budget: defineTool({
    label: "Budjet",
    progress: "Budjet o'qilmoqda",
    description:
      "Current balance of every wallet (cash, Uzcard, Humo...), total money (the user's budget/savings) and how the total " +
      "changed over the last 6 months (balance at the start and end of each month, amount saved). Wallets may hold UZS, USD, " +
      "EUR, USDT or BTC: `balance` is always the so'm equivalent at today's rate, `balanceInCurrency` is the wallet's own " +
      "amount, `exchangeRates` gives so'm per 1 unit.",
    input: z.object({}),
    run: (_input, { now }) => budgetState(now),
  }),

  get_debts: defineTool({
    label: "Qarzlar",
    progress: "Qarzlar o'qilmoqda",
    description:
      "Open debts the user owes (direction 'men qarzdorman'), money other people owe the user ('xaq', direction 'menga " +
      "qarzdor') and bank credits: total, paid, remaining, monthly credit payment, next due date, overdue flags and totals.",
    input: z.object({}),
    run: (_input, { now }) => debtsState(now),
  }),

  get_recurring: defineTool({
    label: "Takroriy to'lovlar",
    progress: "Takroriy to'lovlar o'qilmoqda",
    description:
      "Payments added automatically every month (rent, internet, subscriptions, salary...): amount, category, day of " +
      "month, active flag, next date and the monthly total. Useful for finding subscriptions worth cancelling.",
    input: z.object({}),
    run: () => recurringState(),
  }),
};

export type ToolName = keyof typeof TOOLS;

const isToolName = (name: string): name is ToolName => Object.hasOwn(TOOLS, name);

export function toolLabel(name: string) {
  return isToolName(name) ? TOOLS[name].label : "Ma'lumot";
}

export function toolProgress(name: string) {
  return isToolName(name) ? TOOLS[name].progress : "Ma'lumot o'qilmoqda";
}

/** Claude API uchun vosita ta'riflari (tartibi o'zgarmaydi — prompt keshi uchun muhim) */
export const toolDefinitions: Anthropic.Beta.BetaTool[] = Object.entries(TOOLS).map(([name, tool]) => {
  const schema = z.toJSONSchema(tool.input) as Record<string, unknown>;
  delete schema.$schema;
  return {
    name,
    description: tool.description,
    input_schema: schema as Anthropic.Beta.BetaTool.InputSchema,
    // Kirish qismlari yaratilishi bilan oqimda keladi; to'liqligi pastda zod bilan tekshiriladi
    eager_input_streaming: true,
  };
});

/** Vositani ishga tushiradi; natija yoki xato Claude uchun JSON matn ko'rinishida qaytadi */
export async function runTool(name: string, input: unknown, ctx: ToolContext) {
  if (!isToolName(name)) return { isError: true, content: JSON.stringify({ error: `Bunday vosita yo'q: ${name}` }) };
  const tool = TOOLS[name] as ToolSpec<z.ZodType>;
  const parsed = tool.input.safeParse(input ?? {});
  if (!parsed.success) {
    return {
      isError: true,
      content: JSON.stringify({ INVALID_JSON: JSON.stringify(input), issues: z.prettifyError(parsed.error) }),
    };
  }
  try {
    return { isError: false, content: JSON.stringify(await tool.run(parsed.data, ctx)) };
  } catch (error) {
    console.error(`AI vositasi xatosi (${name}):`, error);
    return { isError: true, content: JSON.stringify({ error: "Ma'lumotni o'qishda xato yuz berdi" }) };
  }
}
