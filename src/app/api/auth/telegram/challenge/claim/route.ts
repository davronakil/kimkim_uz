import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  consumeLoginChallenge,
  getLoginChallenge,
  LOGIN_CHALLENGE_ID_RE,
  loginChallengeStatus,
} from "@/lib/auth/login-challenge";
import { applySessionCookie, createSession } from "@/lib/auth/session";
import { getUserById } from "@/lib/db/queries";

const claimSchema = z.object({
  id: z.string().regex(LOGIN_CHALLENGE_ID_RE),
});

function isSecureRequest(request: NextRequest) {
  return (
    request.url.startsWith("https://") ||
    request.headers.get("x-forwarded-proto") === "https"
  );
}

export async function POST(request: NextRequest) {
  const parsed = claimSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const consumed = await consumeLoginChallenge(parsed.data.id);
  if (!consumed?.user_id) {
    const status = loginChallengeStatus(await getLoginChallenge(parsed.data.id));
    const httpStatus = status === "expired" ? 410 : 409;
    return NextResponse.json({ error: status, status }, { status: httpStatus });
  }

  const user = await getUserById(consumed.user_id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const token = await createSession(user.id);
  const response = NextResponse.json({
    user,
    redirectTo: consumed.redirect_to,
  });
  return applySessionCookie(response, token, isSecureRequest(request));
}
