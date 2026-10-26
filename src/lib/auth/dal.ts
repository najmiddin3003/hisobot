import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { connectDB } from "@/lib/db";
import { ensureDueRecurring } from "@/lib/recurring";
import { readWebSession } from "./session";

/** Bitta so'rov davomida seans faqat bir marta tekshiriladi */
export const getCurrentSession = cache(readWebSession);

/**
 * Sahifa ma'lumotlari uchun: seans tekshiruvi va o'qish bir vaqtda boshlanadi (bazani bir marta kamroq kutamiz).
 * O'qilgan ma'lumot faqat seans to'g'ri bo'lsagina qaytariladi. Seansdan keyin vaqti kelgan takroriy
 * to'lovlar yoziladi — biror narsa yozilsa, ma'lumot yangidan o'qiladi (oyiga bir-ikki marta bo'ladi).
 */
export async function readAsUser<T>(read: () => Promise<T>): Promise<T> {
  // So'rov paytida ishlaydi (oldindan tayyorlashda emas) — read() ichida joriy vaqtni o'qish mumkin
  await connection();
  await connectDB();
  const [created, data] = await Promise.all([requireUser().then(() => ensureDueRecurring()), read()]);
  return created > 0 ? read() : data;
}

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
