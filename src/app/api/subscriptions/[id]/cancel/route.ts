import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";
import { cancelRazorpaySubscription } from "@/lib/nocode/client";
import { syncSubscription } from "@/lib/subscription";

const SYSTEM_TOKEN = process.env.NOCODE_SYSTEM_TOKEN || "";

/** Stops future charges. The learner keeps access until the end of the period they already paid for. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const row = await nocodeDb.serviceSubscriptions.findUnique({ id: (await params).id }, SYSTEM_TOKEN).catch(() => null);
  if (!row || String(row.user_id) !== session.user.id) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }
  if (row.cancelled_at || ["cancelled", "completed", "expired"].includes(String(row.status))) {
    return NextResponse.json({ error: "This subscription has already ended" }, { status: 400 });
  }

  try {
    await cancelRazorpaySubscription(String(row.razorpay_subscription_id), SYSTEM_TOKEN);
    await nocodeDb.serviceSubscriptions.update(String(row.id), { cancelled_at: new Date().toISOString() }, SYSTEM_TOKEN);
    const result = await syncSubscription({ ...row, cancelled_at: new Date().toISOString() });
    return NextResponse.json({ ok: true, currentEnd: result.row.current_end ?? null });
  } catch (error) {
    console.error("Cancel subscription error:", error);
    return NextResponse.json({ error: "Could not cancel the subscription" }, { status: 500 });
  }
}
