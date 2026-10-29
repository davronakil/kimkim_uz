import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { listUserPaymentMethods, replaceUserPaymentMethods } from "@/lib/db/queries";
import {
  normalizePaymentMethod,
  paymentMethodKinds,
  type PaymentMethod,
  type PaymentMethodError,
  type PaymentMethodKind,
} from "@/lib/payments/methods";

const field = z.string().max(254).optional().nullable();

const bodySchema = z.object({
  venmo: field,
  cashapp: field,
  zelle: field,
  apple_cash: field,
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ methods: await listUserPaymentMethods(user.id) });
}

/** Replaces the whole set; blank or missing fields remove that method. */
export async function PUT(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payment methods" }, { status: 400 });
  }

  const methods: PaymentMethod[] = [];
  const errors: Partial<Record<PaymentMethodKind, PaymentMethodError>> = {};

  for (const kind of paymentMethodKinds) {
    const raw = parsed.data[kind]?.trim();
    if (!raw) continue;
    const normalized = normalizePaymentMethod(kind, raw);
    if (normalized.ok) {
      methods.push(normalized.method);
    } else {
      errors[kind] = normalized.error;
    }
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: "Invalid payment methods", errors }, { status: 400 });
  }

  return NextResponse.json({ methods: await replaceUserPaymentMethods(user.id, methods) });
}
