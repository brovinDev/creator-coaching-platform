import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";

const SYSTEM_TOKEN = process.env.NOCODE_SYSTEM_TOKEN || "";

/** The signed-in learner's subscriptions that have been paid for at least once. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await nocodeDb.serviceSubscriptions.findMany({ where: { user_id: session.user.id } }, SYSTEM_TOKEN);
  const paid = rows.filter((r) => Number(r.paid_count) >= 1);
  const out = await Promise.all(
    paid.map(async (r) => {
      const service = await nocodeDb.services.findUnique({ id: String(r.service_id) }, SYSTEM_TOKEN).catch(() => null);
      return {
        id: String(r.id),
        serviceName: String(service?.title || "Subscription"),
        status: String(r.status),
        interval: String(r.billing_interval || ""),
        amount: Number(r.amount) || 0,
        currentEnd: r.current_end ? String(r.current_end) : null,
        access: r.access === "on",
        cancelled: Boolean(r.cancelled_at) || ["cancelled", "completed", "expired", "halted"].includes(String(r.status)),
      };
    })
  );
  return NextResponse.json(out);
}
