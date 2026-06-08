import { NextRequest, NextResponse } from "next/server";
import { destroySession, getSessionCookieOptions, SESSION_COOKIE } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  await destroySession();

  const response = NextResponse.json({ ok: true });
  const secure =
    request.url.startsWith("https://") ||
    request.headers.get("x-forwarded-proto") === "https";
  const options = getSessionCookieOptions(secure);
  const parts = [
    `${SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    `SameSite=${options.sameSite}`,
    "Max-Age=0",
  ];
  if (options.secure) parts.push("Secure");
  response.headers.append("Set-Cookie", parts.join("; "));
  return response;
}
