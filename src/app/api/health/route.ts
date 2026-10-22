import { connection } from "next/server";
import { connectDB } from "@/lib/db";

/** Deploy va monitoring uchun: sayt va MongoDB ishlayaptimi */
export async function GET() {
  await connection();
  try {
    const { connection: db } = await connectDB();
    await db.db?.admin().ping();
    return Response.json({ ok: true, db: "ok" });
  } catch {
    return Response.json({ ok: false, db: "error" }, { status: 503 });
  }
}
