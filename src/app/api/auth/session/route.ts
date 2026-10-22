import { readWebSession, touchSession } from "@/lib/auth/session";

/** Ochiq sahifa har 20 soniyada so'raydi: seans hali amaldami (boshqa joydan kirilmadimi) */
export async function GET() {
  const session = await readWebSession();
  if (session.status !== "ok") {
    return Response.json({ ok: false, reason: session.reason }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  await touchSession(session.sessionId, session.lastSeenAt);
  return Response.json(
    { ok: true, expiresAt: session.expiresAt.toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
