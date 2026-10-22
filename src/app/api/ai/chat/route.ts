import { z } from "zod";
import { runAgent } from "@/lib/ai/agent";
import { AI_MODEL, NOT_CONFIGURED_MESSAGE, aiConfigured } from "@/lib/ai/client";
import { userMessage } from "@/lib/ai/prompt";
import { MAX_MESSAGE_LENGTH, STATUS_NOTES, type ChatStreamEvent } from "@/lib/ai/shared";
import { readWebSession } from "@/lib/auth/session";
import { connectDB } from "@/lib/db";
import { AiChat } from "@/lib/models";

// Javob bir necha vosita chaqiruvidan iborat bo'lishi mumkin
export const maxDuration = 300;

const bodySchema = z.object({
  chatId: z
    .string()
    .regex(/^[a-f0-9]{24}$/)
    .optional(),
  message: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
});

const TITLE_LENGTH = 60;

const titleFrom = (message: string) => {
  const line = message.split("\n")[0].trim();
  return line.length > TITLE_LENGTH ? `${line.slice(0, TITLE_LENGTH - 1)}…` : line;
};

/** AI yordamchiga savol: javob qatorma-qator JSON hodisalar bilan oqimda qaytadi, suhbat bazaga yoziladi */
export async function POST(request: Request) {
  const session = await readWebSession();
  if (session.status !== "ok") {
    return Response.json({ error: "Seans tugagan. Qaytadan kiring." }, { status: 401 });
  }
  if (!aiConfigured()) return Response.json({ error: NOT_CONFIGURED_MESSAGE }, { status: 503 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Xabar bo'sh yoki juda uzun" }, { status: 400 });
  const { chatId, message } = parsed.data;

  await connectDB();
  const chat = chatId ? await AiChat.findById(chatId) : new AiChat({ title: titleFrom(message) });
  if (!chat) return Response.json({ error: "Suhbat topilmadi" }, { status: 404 });

  const now = new Date();
  // Avvalgi tarix o'zgartirilmaydi — faqat yangi xabarlar qo'shiladi
  const messages = [...chat.apiMessages, userMessage(message, now)];
  const encoder = new TextEncoder();

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: ChatStreamEvent) => {
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          // Sayt yopilgan — javob baribir bazaga yoziladi
        }
      };
      send({ type: "chat", id: String(chat._id), title: chat.title });

      const result = await runAgent({ messages, now, signal: request.signal, onEvent: send });
      const finishedAt = new Date();
      const text = result.text.trim();

      try {
        chat.apiMessages = messages;
        chat.markModified("apiMessages");
        chat.turns.push(
          { role: "user", text: message, tools: [], status: "ok", at: now },
          { role: "assistant", text, tools: result.tools, status: result.status, at: finishedAt },
        );
        chat.aiModel = AI_MODEL;
        await chat.save();
      } catch (error) {
        console.error("AI suhbatini saqlab bo'lmadi:", error);
      }

      const error = result.status === "ok" ? undefined : (result.error ?? STATUS_NOTES[result.status]);
      send({ type: "done", status: result.status, text, tools: result.tools, at: finishedAt.toISOString(), error });
      try {
        controller.close();
      } catch {
        // allaqachon yopilgan
      }
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
