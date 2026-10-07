import { NextRequest, NextResponse, after } from "next/server";
import { nocodeDb } from "@/lib/nocode/db";
import { auth } from "@/lib/auth";
import { sendRegistrationEmails } from "@/lib/registration-emails";
import { redeemCoupon } from "@/lib/coupons";
import crypto from "crypto";

const SYSTEM_TOKEN = process.env.NOCODE_SYSTEM_TOKEN || "";

function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string): boolean {
  const body = orderId + "|" + paymentId;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(body)
    .digest("hex");
  return expectedSignature === signature;
}

export async function POST(req: NextRequest) {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = await req.json();

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json({ error: "Missing payment details" }, { status: 400 });
    }

    const isValid = verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    const order = await nocodeDb.orders.findUnique({ razorpay_order_id: razorpayOrderId }, SYSTEM_TOKEN);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status === "paid") {
      const course = await nocodeDb.courses.findUnique({ id: String(order.course_id) }, SYSTEM_TOKEN);
      return NextResponse.json({ message: "Payment already processed", courseSlug: course?.slug });
    }

    await nocodeDb.orders.update(
      String(order.id),
      { status: "paid", razorpay_payment_id: razorpayPaymentId, razorpay_signature: razorpaySignature },
      SYSTEM_TOKEN
    );

    const serviceId = order.service_id ? String(order.service_id) : null;

    if (serviceId) {
      await nocodeDb.enrollments.create(
        { user_id: String(order.user_id), service_id: serviceId },
        SYSTEM_TOKEN
      );
    } else {
      await nocodeDb.enrollments.create(
        { user_id: String(order.user_id), course_id: String(order.course_id) },
        SYSTEM_TOKEN
      );
    }

    if (order.coupon_id) await redeemCoupon(String(order.coupon_id));

    const course = await nocodeDb.courses.findUnique({ id: String(order.course_id) }, SYSTEM_TOKEN);
    const service = serviceId
      ? await nocodeDb.services.findUnique({ id: serviceId }, SYSTEM_TOKEN)
      : null;

    const courseSlug = (course?.slug as string) || "";
    const serviceName = String(service?.title || course?.title || "Course");
    const amount = Number(order.amount) || 0;

    // The learner is the signed-in user who started checkout, so the session is the
    // reliable source of their email. Only trust it when it matches the order.
    const session = await auth();
    const sessionMatchesOrder = session?.user?.id === String(order.user_id);

    after(() =>
      sendRegistrationEmails({
        userId: String(order.user_id),
        learner: sessionMatchesOrder
          ? { name: session?.user?.name, email: session?.user?.email }
          : undefined,
        serviceId,
        courseId: String(order.course_id),
        amount,
        transactionId: razorpayPaymentId,
      })
    );

    return NextResponse.json({
      message: "Payment verified and enrollment created",
      courseSlug,
      transactionId: razorpayPaymentId,
      amount,
      serviceName,
      paymentMethod: "Razorpay",
    });
  } catch (error) {
    console.error("Verify payment error:", error);
    return NextResponse.json({ error: "Payment verification failed" }, { status: 500 });
  }
}
