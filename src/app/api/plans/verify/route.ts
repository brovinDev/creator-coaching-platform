import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";
import { confirmPayment } from "@/lib/payment-confirmation";
import { addInterval, isInterval } from "@/lib/plans";

const SYSTEM_TOKEN = process.env.NOCODE_SYSTEM_TOKEN || "";

/** Called after the Razorpay window reports success. Razorpay is asked before the plan is switched on. */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "CREATOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { razorpayOrderId, razorpayPaymentId } = await req.json();
    if (!razorpayOrderId || !razorpayPaymentId) {
      return NextResponse.json({ error: "Missing payment details" }, { status: 400 });
    }

    const row = await nocodeDb.planPayments.findUnique({ razorpay_order_id: String(razorpayOrderId) }, SYSTEM_TOKEN);
    if (!row || String(row.creator_id) !== session.user.id) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }
    if (row.status === "paid") return NextResponse.json({ message: "Plan already active" });

    const confirmation = await confirmPayment({
      razorpayOrderId: String(razorpayOrderId),
      razorpayPaymentId: String(razorpayPaymentId),
      expectedPaise: Number(row.amount) * 100,
    });
    if (confirmation.state === "pending") {
      return NextResponse.json({ error: "Payment is still being confirmed. Please check again shortly." }, { status: 504 });
    }
    if (confirmation.state === "failed") return NextResponse.json({ error: "Payment was not successful" }, { status: 402 });
    if (confirmation.state === "mismatch") return NextResponse.json({ error: confirmation.reason }, { status: 400 });

    const interval = isInterval(row.billing_interval) ? row.billing_interval : "monthly";
    const now = new Date();
    await nocodeDb.planPayments.update(
      String(row.id),
      {
        status: "paid",
        razorpay_payment_id: String(razorpayPaymentId),
        invoice_no: `INV/${now.getFullYear()}/${String(row.id).padStart(6, "0")}`,
        paid_at: now.toISOString(),
        expires_at: addInterval(now, interval).toISOString(),
      },
      SYSTEM_TOKEN
    );

    return NextResponse.json({ message: "Plan active" });
  } catch (error) {
    console.error("Plan verify error:", error);
    return NextResponse.json({ error: "Payment verification failed" }, { status: 500 });
  }
}
