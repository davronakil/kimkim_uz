import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { updateUserPayoutPreferences } from "@/lib/db/queries";

const payoutSchema = z.object({
  payout_method: z.string().trim().max(80).optional().nullable(),
  payout_details: z.string().trim().max(1200).optional().nullable(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    payout_method: user.payout_method,
    payout_details: user.payout_details,
    payout_updated_at: user.payout_updated_at,
  });
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = payoutSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payout details" }, { status: 400 });
  }

  const payoutMethod = parsed.data.payout_method?.trim() || null;
  const payoutDetails = parsed.data.payout_details?.trim() || null;
  const updated = await updateUserPayoutPreferences({
    userId: user.id,
    payoutMethod,
    payoutDetails,
  });

  return NextResponse.json({
    payout_method: updated?.payout_method ?? payoutMethod,
    payout_details: updated?.payout_details ?? payoutDetails,
    payout_updated_at: updated?.payout_updated_at ?? null,
  });
}
