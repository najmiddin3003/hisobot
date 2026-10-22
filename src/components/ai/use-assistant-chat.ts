"use client";

import { useCallback, useRef, useState } from "react";
import { getChat } from "@/lib/ai/actions";
import { STATUS_NOTES, stepSeparator, type ChatStreamEvent, type ChatTurn } from "@/lib/ai/shared";

export type UiTurn = ChatTurn & {
  key: string;
  /** Javob hali yozilmoqda */
  pending?: boolean;
  /** Hozir ishlayotgan vosita (qisqa nomi) */
  activeTool?: string;
  /** "Oylik hisobot o'qilmoqda" */
  progress?: string;
  /** Javob to'liq bo'lmagani sababi */
  note?: string;
};

const noteFor = (turn: ChatTurn) => (turn.status === "ok" ? undefined : STATUS_NOTES[turn.status]);

/** Suhbat holati va /api/ai/chat oqimini o'qish */
export function useAssistantChat({ onFinished, onNotConfigured }: { onFinished: () => void; onNotConfigured: () => void }) {
  const [chatId, setChatId] = useState<string | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [turns, setTurns] = useState<UiTurn[]>([]);
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const keyRef = useRef(0);
  const nextKey = () => `t${++keyRef.current}`;

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setChatId(null);
    setTitle(null);
    setTurns([]);
  }, []);

  const load = useCallback(async (id: string) => {
    abortRef.current?.abort();
    const chat = await getChat(id);
    if (!chat) return false;
    setChatId(chat.id);
    setTitle(chat.title);
    setTurns(chat.turns.map((t) => ({ ...t, key: `t${++keyRef.current}`, note: noteFor(t) })));
    return true;
  }, []);

  const send = async (message: string, options: { fresh?: boolean } = {}) => {
    const text = message.trim();
    if (!text || busy) return;

    const now = new Date().toISOString();
    const botKey = nextKey();
    const base = options.fresh ? [] : turns;
    setTurns([
      ...base,
      { key: nextKey(), role: "user", text, tools: [], status: "ok", at: now },
      { key: botKey, role: "assistant", text: "", tools: [], status: "ok", at: now, pending: true },
    ]);
    if (options.fresh) {
      setChatId(null);
      setTitle(null);
    }

    const update = (patch: Partial<UiTurn>) =>
      setTurns((list) => list.map((t) => (t.key === botKey ? { ...t, ...patch } : t)));

    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);

    let answer = "";
    let stepStart = 0;
    const tools: string[] = [];

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: options.fresh ? undefined : (chatId ?? undefined), message: text }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        if (response.status === 503) onNotConfigured();
        update({ pending: false, status: "error", note: data?.error ?? STATUS_NOTES.error });
        return;
      }

      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        let newline: number;
        while ((newline = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, newline).trim();
          buffer = buffer.slice(newline + 1);
          if (!line) continue;
          const event = JSON.parse(line) as ChatStreamEvent;
          switch (event.type) {
            case "chat":
              setChatId(event.id);
              setTitle(event.title);
              break;
            case "step":
              answer += stepSeparator(answer);
              stepStart = answer.length;
              break;
            case "retry":
              answer = answer.slice(0, stepStart);
              update({ text: answer });
              break;
            case "text":
              answer += event.text;
              update({ text: answer, activeTool: undefined, progress: undefined });
              break;
            case "tool":
              if (!tools.includes(event.label)) tools.push(event.label);
              update({ tools: [...tools], activeTool: event.label, progress: event.progress });
              break;
            case "done":
              update({
                text: event.text,
                tools: event.tools,
                status: event.status,
                at: event.at,
                note: event.error,
                pending: false,
                activeTool: undefined,
                progress: undefined,
              });
              break;
          }
        }
      }
    } catch {
      update(
        controller.signal.aborted
          ? { status: "aborted", note: STATUS_NOTES.aborted }
          : { status: "error", note: "Aloqa uzildi. Internetni tekshirib, qayta urinib ko'ring." },
      );
    } finally {
      update({ pending: false, activeTool: undefined, progress: undefined });
      if (abortRef.current === controller) abortRef.current = null;
      setBusy(false);
      onFinished();
    }
  };

  const stop = () => abortRef.current?.abort();

  return { chatId, title, turns, busy, send, stop, reset, load };
}
