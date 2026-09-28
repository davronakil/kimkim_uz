import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { fulfillBusinessSlotCheckout } from "@/lib/stripe/fulfill-business-slot";

/**
 * Redeems a Stripe business-slot checkout session. POST-only on purpose: link
 * previews and in-app browsers issue GETs, and this call must never fire
 * without a tap.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionId = request.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  try {
    const result = await fulfillBusinessSlotCheckout(sessionId, user.id);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Business slot fulfillment failed:", error);
    return NextResponse.json({ error: "Could not confirm payment" }, { status: 500 });
  }
}
