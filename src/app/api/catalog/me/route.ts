import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getBusinessListingSlotSummaryForUser,
  listBusinessListingsForUser,
} from "@/lib/db/catalog-queries";
import { businessSlotCurrency, businessSlotPriceCents } from "@/lib/stripe/business-slots";
import { getEnv } from "@/lib/cloudflare";
import { isStripeConfigured } from "@/lib/stripe/checkout";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [listings, slots] = await Promise.all([
    listBusinessListingsForUser(user.id),
    getBusinessListingSlotSummaryForUser(user),
  ]);

  const env = await getEnv();

  return NextResponse.json({
    listings,
    slots,
    extraSlot: {
      available: isStripeConfigured(env.STRIPE_SECRET_KEY),
      priceCents: businessSlotPriceCents(env),
      currency: businessSlotCurrency(env),
    },
  });
}
