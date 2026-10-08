import { NextRequest, NextResponse, after } from "next/server";
import { nocodeDb } from "@/lib/nocode/db";
import { auth } from "@/lib/auth";
import { confirmPayment } from "@/lib/payment-confirmation";
import { finalizeOrder } from "@/lib/finalize-order";

const SYSTEM_TOKEN = process.env.NOCODE_SYSTEM_TOKEN || "";

export async function POST(req: NextRequest) {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = await req.json();

    if (!razorpayOrderId || !razorpayPaymentId) {
      return NextResponse.json({ error: "Missing payment details" }, { status: 400 });
    }

    const order = await nocodeDb.orders.findUnique({ razorpay_order_id: razorpayOrderId }, SYSTEM_TOKEN);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // The learner is the signed-in user who started checkout, so the session is the reliable source of
    // their email. It is only used when it matches the order, and a lapsed session never blocks a payment.
    const session = await auth();
    const sessionMatchesOrder = session?.user?.id === String(order.user_id);

    if (order.status === "paid") {
      const done = await finalizeOrder(order, {});
      return NextResponse.json({ message: "Payment already processed", courseSlug: done.courseSlug });
    }

    // Ask Razorpay whether the money really moved; the payment id from the browser is not taken on trust.
    const confirmation = await confirmPayment({
      razorpayOrderId,
      razorpayPaymentId,
      expectedPaise: Number(order.amount) * 100,
    });
    if (confirmation.state === "pending") {
      return NextResponse.json({ error: "Payment is still being confirmed. Please check again shortly." }, { status: 504 });
    }
    if (confirmation.state === "failed") {
      return NextResponse.json({ error: "Payment was not successful" }, { status: 402 });
    }
    if (confirmation.state === "mismatch") {
      console.error("[verify-payment] not accepted", { razorpayOrderId, reason: confirmation.reason });
      return NextResponse.json({ error: confirmation.reason }, { status: 400 });
    }

    const done = await finalizeOrder(order, {
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
      learner: sessionMatchesOrder ? { name: session?.user?.name, email: session?.user?.email } : undefined,
    });
    if (done.firstTime) after(done.sendEmails);

    return NextResponse.json({
      message: "Payment verified and enrollment created",
      courseSlug: done.courseSlug,
      transactionId: razorpayPaymentId,
      amount: done.amount,
      serviceName: done.serviceName,
      paymentMethod: "Razorpay",
    });
  } catch (error) {
    console.error("Verify payment error:", error);
    return NextResponse.json({ error: "Payment verification failed" }, { status: 500 });
  }
}
