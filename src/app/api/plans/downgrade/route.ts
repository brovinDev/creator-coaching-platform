import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";
import { planState } from "@/lib/plans";

const SYSTEM_TOKEN = process.env.NOCODE_SYSTEM_TOKEN || "";

/** Moves the creator to Basic when the paid period they are in ends. Nothing changes until then. */
export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "CREATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { payment } = await planState(session.user.id);
  if (!payment) return NextResponse.json({ error: "You are already on Basic" }, { status: 400 });

  await nocodeDb.planPayments.update(payment.id, { cancelled_at: new Date().toISOString() }, SYSTEM_TOKEN);
  return NextResponse.json({ message: "Downgrade scheduled" });
}
