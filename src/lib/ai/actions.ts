"use server";

import { isValidObjectId } from "mongoose";
import { requireActionSession } from "@/lib/auth/guard";
import { connectDB } from "@/lib/db";
import { AiChat } from "@/lib/models";
import { aiConfigured } from "./client";
import type { ChatSummary, ChatTurn } from "./shared";

const HISTORY_LIMIT = 30;

/** Panel ochilganda: AI ulanganmi va oxirgi suhbatlar */
export async function getAssistantState(): Promise<{ configured: boolean; chats: ChatSummary[] }> {
  await requireActionSession();
  await connectDB();
  const chats = await AiChat.find({}, { title: 1, updatedAt: 1, turns: 1 })
    .sort({ updatedAt: -1 })
    .limit(HISTORY_LIMIT)
    .lean();
  return {
    configured: aiConfigured(),
    chats: chats.map((c) => ({
      id: String(c._id),
      title: c.title,
      updatedAt: c.updatedAt.toISOString(),
      turns: c.turns.length,
    })),
  };
}

/** Bitta suhbatning saytda ko'rinadigan xabarlari (Claude uchun saqlangan tarix mijozga yuborilmaydi) */
export async function getChat(id: string): Promise<{ id: string; title: string; turns: ChatTurn[] } | null> {
  await requireActionSession();
  if (!isValidObjectId(id)) return null;
  await connectDB();
  const chat = await AiChat.findById(id, { title: 1, turns: 1 }).lean();
  if (!chat) return null;
  return {
    id: String(chat._id),
    title: chat.title,
    turns: chat.turns.map((t) => ({
      role: t.role,
      text: t.text,
      tools: t.tools,
      status: t.status,
      at: t.at.toISOString(),
    })),
  };
}

export async function deleteChat(id: string) {
  await requireActionSession();
  if (!isValidObjectId(id)) return;
  await connectDB();
  await AiChat.deleteOne({ _id: id });
}
