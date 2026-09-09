import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "@/lib/session";

// Optimistic auth check only — reads the session cookie, no database call.
// The real authorization check happens in the DAL (src/lib/dal.ts) on every
// server data access and Server Action, per Next.js's auth guide.
const PUBLIC_ROUTES = ["/login", "/signup"];

export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isPublicRoute = PUBLIC_ROUTES.includes(path);

  const cookie = req.cookies.get("session")?.value;
  const session = await decrypt(cookie);
  const isAuthed = Boolean(session?.userId);

  if (!isPublicRoute && !isAuthed) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (isPublicRoute && isAuthed) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|ico)$).*)"],
};
