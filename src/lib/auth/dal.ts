import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { readWebSession } from "./session";

/** Bitta so'rov davomida seans faqat bir marta tekshiriladi */
export const getCurrentSession = cache(readWebSession);

/**
 * Har bir himoyalangan sahifa, server action va API shu funksiya orqali o'tadi.
 * Seans yaroqsiz bo'lsa — sababi bilan login sahifasiga yuboradi.
 */
export async function requireUser() {
  const session = await getCurrentSession();
  if (session.status !== "ok") {
    redirect(session.reason ? `/login?sabab=${session.reason}` : "/login");
  }
  return session.user;
}
