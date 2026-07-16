import { NextRequest, NextResponse } from "next/server";
import { makeSessionCookieValue, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  if (password !== process.env.PORTAL_PASSWORD) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, await makeSessionCookieValue(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    // No maxAge — this makes it a session cookie. It's cleared when the
    // browser (or, for a home-screen PWA, the standalone app) is fully
    // terminated, so the password is asked for again on the next real open.
  });
  return res;
}
