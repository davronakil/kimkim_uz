import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { toggleBusinessListingVouch } from "@/lib/db/catalog-queries";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const result = await toggleBusinessListingVouch(id, user.id);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update vouch";
    if (message === "Cannot vouch for your own listing") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    if (message === "Listing not found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: "Could not update vouch" }, { status: 500 });
  }
}
