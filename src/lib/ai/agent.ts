import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { aiErrorMessage, commonParams, getAnthropic } from "./client";
import { CHAT_SYSTEM_PROMPT } from "./prompt";
import { stepSeparator, type AiTurnStatus } from "./shared";
import { runTool, toolDefinitions, toolLabel, toolProgress } from "./tools";

type Message = Anthropic.Beta.BetaMessageParam;
type Block = Anthropic.Beta.BetaContentBlock;

/** Saytga oqim bilan yuboriladigan hodisalar */
export type AgentEvent =
  /** Yangi API chaqiruvi boshlandi (oldingi matndan keyin bo'sh qator qo'yiladi) */
  | { type: "step" }
  /** Chaqiruv qayta yuborilmoqda — shu qadamda kelgan matn bekor */
  | { type: "retry" }
  | { type: "text"; text: string }
  | { type: "tool"; name: string; label: string; progress: string };

export type AgentResult = { status: AiTurnStatus; text: string; tools: string[]; error?: string };

/** Bir savolga javob berishda modelga necha marta murojaat qilish mumkin (vositalar zanjiri cheksiz bo'lmasin) */
const MAX_STEPS = 8;
const MAX_JSON_RETRIES = 2;

/**
 * Model rad etib, javobni boshqa model davom ettirgan bo'lsa: rad etilgan qismning
 * thinking va tool_use bloklari tarixga qo'shilmaydi (matn bloklari qoladi).
 */
function withoutDeclinedPartial(content: Block[]) {
  const boundary = content.findLastIndex((b) => b.type === "fallback");
  if (boundary < 0) return content;
  const dropped = new Set(["thinking", "redacted_thinking", "tool_use"]);
  return content.filter((b, i) => i > boundary || !dropped.has(b.type));
}

/**
 * Savolga javob: model kerakli vositalarni chaqiradi, natijalarni o'qiydi va javob yozadi.
 * `messages` faqat oxiriga qo'shib boriladi (oldingi qismi hech qachon o'zgarmaydi) — tarix shu holicha saqlanadi.
 * Hech qachon xato tashlamaydi: xato natijada status bilan qaytadi.
 */
export async function runAgent({
  messages,
  now,
  signal,
  onEvent,
}: {
  messages: Message[];
  now: Date;
  signal?: AbortSignal;
  onEvent: (event: AgentEvent) => void;
}): Promise<AgentResult> {
  const client = getAnthropic();
  const tools = new Set<string>();
  let text = "";
  let jsonRetries = 0;

  const result = (status: AiTurnStatus, error?: string): AgentResult => ({
    status,
    text,
    tools: [...tools].map(toolLabel),
    error,
  });

  try {
    for (let step = 0; step < MAX_STEPS; ) {
      text += stepSeparator(text);
      const stepStart = text.length;
      onEvent({ type: "step" });

      const stream = client.beta.messages.stream(
        {
          ...commonParams,
          max_tokens: 64_000,
          output_config: { effort: "medium" },
          // Oxirgi blokkacha keshlanadi: keyingi qadam va keyingi savollarda tarix arzonroq o'qiladi
          cache_control: { type: "ephemeral" },
          system: CHAT_SYSTEM_PROMPT,
          tools: toolDefinitions,
          messages,
        },
        { signal },
      );
      stream.on("text", (delta) => {
        text += delta;
        onEvent({ type: "text", text: delta });
      });
      stream.on("streamEvent", (event) => {
        if (event.type === "content_block_start" && event.content_block.type === "tool_use") {
          const { name } = event.content_block;
          onEvent({ type: "tool", name, label: toolLabel(name), progress: toolProgress(name) });
        }
      });

      let message: Anthropic.Beta.BetaMessage;
      try {
        message = await stream.finalMessage();
        jsonRetries = 0;
      } catch (error) {
        // Faqat vosita kirishi JSON sifatida o'qilmagan holat qayta yuboriladi; API xatolari yuqoriga chiqadi
        if (error instanceof Anthropic.APIError || jsonRetries >= MAX_JSON_RETRIES) throw error;
        jsonRetries++;
        text = text.slice(0, stepStart);
        onEvent({ type: "retry" });
        continue;
      }
      step++;

      // Rad etilgan javobning qismi tarixga ham, natijaga ham kirmaydi
      if (message.stop_reason === "refusal") {
        text = text.slice(0, stepStart).trimEnd();
        return result("refusal");
      }

      const content = withoutDeclinedPartial(message.content);
      const toolUses = content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
      // max_tokens'da kesilgan vosita kirishi to'liq emas — uni ishga tushirib bo'lmaydi
      if (message.stop_reason === "max_tokens" && toolUses.length > 0) return result("truncated");

      messages.push({ role: "assistant", content });
      if (message.stop_reason === "pause_turn") continue;
      if (toolUses.length === 0) return result(message.stop_reason === "max_tokens" ? "truncated" : "ok");

      // Barcha vositalar parallel ishlaydi; natijalar bitta xabarda qaytadi
      const results = await Promise.all(
        toolUses.map(async (block): Promise<Anthropic.Beta.BetaToolResultBlockParam> => {
          tools.add(block.name);
          const output = await runTool(block.name, block.input, { now });
          return { type: "tool_result", tool_use_id: block.id, content: output.content, is_error: output.isError };
        }),
      );
      messages.push({ role: "user", content: results });
    }
    return result("limit");
  } catch (error) {
    const message = aiErrorMessage(error);
    return message === null || signal?.aborted ? result("aborted") : result("error", message);
  }
}
