import { NextRequest, NextResponse, after } from "next/server";
import { nocodeDb } from "@/lib/nocode/db";
import { auth } from "@/lib/auth";
import { sendFirstPaymentEmails, syncSubscription } from "@/lib/subscription";

const SYSTEM_TOKEN = process.env.NOCODE_SYSTEM_TOKEN || "";
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Called after the Razorpay window reports success. The browser's word is not enough: Razorpay is
 * asked about the subscription, and access is only given once its first payment has gone through.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Please sign in to continue" }, { status: 401 });

    const { subscriptionId } = await req.json();
    if (!subscriptionId) return NextResponse.json({ error: "Missing subscription" }, { status: 400 });

    const row = await nocodeDb.serviceSubscriptions.findUnique({ razorpay_subscription_id: String(subscriptionId) }, SYSTEM_TOKEN);
    if (!row || String(row.user_id) !== session.user.id) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    // Razorpay can take a few seconds to report the first charge.
    let result = await syncSubscription(row);
    for (let attempt = 1; attempt < 6 && !result.access; attempt++) {
      await wait(1500);
      result = await syncSubscription(result.row);
    }
    if (!result.access) {
      return NextResponse.json({ error: "Payment is still being confirmed. Please check again shortly." }, { status: 504 });
    }

    if (result.firstPayment) {
      const learner = { name: session.user.name, email: session.user.email };
      after(() => sendFirstPaymentEmails(row, result, learner).catch((e) => console.error("[subscription] email failed", e)));
    }

    const service = await nocodeDb.services.findUnique({ id: String(row.service_id) }, SYSTEM_TOKEN).catch(() => null);
    return NextResponse.json({
      message: "Subscription active",
      transactionId: result.latestPaymentId,
      amount: result.amount,
      serviceName: String(service?.title || "Subscription"),
      paymentMethod: "Razorpay",
    });
  } catch (error) {
    console.error("Verify subscription error:", error);
    return NextResponse.json({ error: "Payment verification failed" }, { status: 500 });
  }
}
