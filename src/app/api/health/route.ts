import { connection } from "next/server";
import { connectDB } from "@/lib/db";

/** Deploy va monitoring uchun: sayt va MongoDB ishlayaptimi, bazagacha kechikish qancha */
export async function GET() {
  await connection();
  try {
    const { connection: db } = await connectDB();
    // Bazagacha borib-kelish vaqti (ulanish tayyor bo'lgandan keyin) — sekinlikni aniqlash uchun
    const started = performance.now();
    await db.db?.admin().ping();
    const pingMs = Math.round(performance.now() - started);
    return Response.json({ ok: true, db: "ok", pingMs }, { headers: { "Server-Timing": `db;dur=${pingMs}` } });
  } catch {
    return Response.json({ ok: false, db: "error" }, { status: 503 });
  }
}
