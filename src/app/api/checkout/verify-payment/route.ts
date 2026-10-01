import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyRazorpaySignature } from "@/lib/razorpay";
import {
  sendEmail,
  paymentConfirmationEmail,
  enrollmentEmail,
  creatorPurchaseNotificationEmail,
} from "@/lib/email";

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

    const order = await db.order.findUnique({
      where: { razorpayOrderId },
      include: {
        user: true,
        course: { include: { creator: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status === "paid") {
      return NextResponse.json({ message: "Payment already processed", courseSlug: order.course.slug });
    }

    await db.order.update({
      where: { id: order.id },
      data: {
        status: "paid",
        razorpayPaymentId,
        razorpaySignature,
      },
    });

    await db.enrollment.create({
      data: {
        userId: order.userId,
        courseId: order.courseId,
      },
    });

    const paymentEmail = paymentConfirmationEmail(order.user.name, order.course.title, order.amount);
    sendEmail({ to: order.user.email, ...paymentEmail });

    const enrollEmail = enrollmentEmail(order.user.name, order.course.title);
    sendEmail({ to: order.user.email, ...enrollEmail });

    const creatorEmail = creatorPurchaseNotificationEmail(
      order.course.creator.name,
      order.user.name,
      order.course.title,
      order.amount
    );
    sendEmail({ to: order.course.creator.email, ...creatorEmail });

    return NextResponse.json({
      message: "Payment verified and enrollment created",
      courseSlug: order.course.slug,
    });
  } catch (error) {
    console.error("Verify payment error:", error);
    return NextResponse.json({ error: "Payment verification failed" }, { status: 500 });
  }
}
