import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";

/**
 * Tezkor (optimistik) tekshiruv: seans cookie'si umuman yo'q bo'lsa, login sahifasiga.
 * Cookie haqiqiyligini har bir sahifa bazadan o'zi tekshiradi (src/lib/auth/dal.ts).
 */
export function proxy(request: NextRequest) {
  if (!request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // login, API (o'zi tekshiradi) va statik fayllardan tashqari hamma sahifalar
  matcher: ["/((?!login|api|_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp|txt)$).*)"],
};
