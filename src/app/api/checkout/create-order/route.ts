import { NextRequest, NextResponse } from "next/server";
import { nocodeDb } from "@/lib/nocode/db";
import { auth, getNocodeToken } from "@/lib/auth";
import { loadUsableCoupon, serviceTotal } from "@/lib/coupons";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Please sign in to continue" }, { status: 401 });
    }

    const token = await getNocodeToken();
    const { courseId, serviceId, amount, couponId, customFields } = await req.json();

    if (!courseId) {
      return NextResponse.json({ error: "Course ID is required" }, { status: 400 });
    }

    const course = await nocodeDb.courses.findUnique({ id: courseId }, token);
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    let price = amount ? Number(amount) : Number(course.price) || 0;

    if (serviceId) {
      const service = await nocodeDb.services.findUnique({ id: serviceId }, token);
      if (service) {
        let coupon: Record<string, unknown> | null = null;
        if (couponId) {
          const result = await loadUsableCoupon(String(couponId), String(serviceId));
          if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
          coupon = result.coupon;
        }
        price = serviceTotal(service, coupon);
      }
    }

    if (price === 0) {
      return NextResponse.json({ error: "This is free, no payment needed" }, { status: 400 });
    }

    if (serviceId) {
      const existingEnrollments = await nocodeDb.enrollments.findMany(
        { where: { user_id: session.user.id, service_id: serviceId } },
        token
      );
      if (existingEnrollments.length > 0) {
        return NextResponse.json({ error: "Already enrolled in this service" }, { status: 400 });
      }
    } else {
      const existingEnrollments = await nocodeDb.enrollments.findMany(
        { where: { user_id: session.user.id, course_id: courseId } },
        token
      );
      if (existingEnrollments.length > 0) {
        return NextResponse.json({ error: "Already enrolled in this course" }, { status: 400 });
      }
    }

    const razorpayOrder = await razorpay.orders.create({
      amount: price * 100,
      currency: "INR",
      receipt: `order_${Date.now()}`,
    });

    await nocodeDb.orders.create(
      {
        user_id: session.user.id,
        course_id: courseId,
        service_id: serviceId || null,
        amount: price,
        currency: "INR",
        status: "pending",
        razorpay_order_id: razorpayOrder.id,
        coupon_id: couponId || null,
        custom_fields: customFields ? JSON.stringify(customFields) : null,
      },
      token
    );

    return NextResponse.json({
      razorpayOrderId: razorpayOrder.id,
      amount: price * 100,
      currency: "INR",
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Create order error:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
