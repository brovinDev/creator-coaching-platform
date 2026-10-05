import { NextRequest, NextResponse } from "next/server";
import { nocodeDb } from "@/lib/nocode/db";
import crypto from "crypto";
import {
  sendEmail,
  paymentConfirmationEmail,
  enrollmentEmail,
  creatorPurchaseNotificationEmail,
} from "@/lib/email";

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

    const course = await nocodeDb.courses.findUnique({ id: String(order.course_id) }, SYSTEM_TOKEN);
    const userProfile = await nocodeDb.userProfiles.findUnique({ user_id: String(order.user_id) }, SYSTEM_TOKEN);

    const userName = (userProfile?.name as string) || "Student";
    const userEmail = (userProfile?.email as string) || "";
    const courseTitle = (course?.title as string) || "Course";
    const courseSlug = (course?.slug as string) || "";
    const amount = Number(order.amount) || 0;

    if (userEmail) {
      const paymentEmail = paymentConfirmationEmail(userName, courseTitle, amount);
      sendEmail({ to: userEmail, ...paymentEmail });

      const enrollEmail = enrollmentEmail(userName, courseTitle);
      sendEmail({ to: userEmail, ...enrollEmail });
    }

    if (course?.creator_id) {
      const creatorProfile = await nocodeDb.userProfiles.findUnique(
        { user_id: String(course.creator_id) },
        SYSTEM_TOKEN
      );
      if (creatorProfile?.email) {
        const creatorEmail = creatorPurchaseNotificationEmail(
          (creatorProfile.name as string) || "Creator",
          userName,
          courseTitle,
          amount
        );
        sendEmail({ to: creatorProfile.email as string, ...creatorEmail });
      }
    }

    return NextResponse.json({
      message: "Payment verified and enrollment created",
      courseSlug,
      transactionId: razorpayPaymentId,
      amount,
      serviceName: courseTitle,
      paymentMethod: "Razorpay",
    });
  } catch (error) {
    console.error("Verify payment error:", error);
    return NextResponse.json({ error: "Payment verification failed" }, { status: 500 });
  }
}
