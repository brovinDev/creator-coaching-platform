import { NextRequest, NextResponse } from "next/server";
import { nocodeDb } from "@/lib/nocode/db";
import { auth, getNocodeToken } from "@/lib/auth";
import { resolvePurchase } from "@/lib/checkout";
import { createRazorpayOrder } from "@/lib/nocode/client";

const SYSTEM_TOKEN = process.env.NOCODE_SYSTEM_TOKEN || "";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Please sign in to continue" }, { status: 401 });
    }

    const token = await getNocodeToken();
    // The amount is not read from the request: the price always comes from the service (or course).
    const { courseId, serviceId, couponId, customFields } = await req.json();

    const purchase = await resolvePurchase({ userId: session.user.id, serviceId, courseId, couponId }, token);
    if ("error" in purchase) {
      return NextResponse.json({ error: purchase.error }, { status: purchase.status });
    }

    const razorpayOrder = await createRazorpayOrder(
      {
        amount: purchase.price * 100,
        currency: "INR",
        description: `Order for ${purchase.title}`,
        metadata: {
          user_id: session.user.id,
          service_id: purchase.serviceId || "",
          course_id: purchase.courseId || "",
        },
      },
      SYSTEM_TOKEN
    );

    await nocodeDb.orders.create(
      {
        user_id: session.user.id,
        // A service order carries no course: a service may have none, or several.
        course_id: purchase.courseId,
        service_id: purchase.serviceId,
        amount: purchase.price,
        currency: "INR",
        status: "pending",
        razorpay_order_id: razorpayOrder.orderId,
        coupon_id: purchase.couponId,
        custom_fields: customFields ? JSON.stringify(customFields) : null,
      },
      token
    );

    return NextResponse.json({
      razorpayOrderId: razorpayOrder.orderId,
      amount: purchase.price * 100,
      currency: "INR",
      key: razorpayOrder.keyId,
    });
  } catch (error) {
    console.error("Create order error:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
