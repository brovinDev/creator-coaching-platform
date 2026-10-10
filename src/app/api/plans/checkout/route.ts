import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";
import { createRazorpayOrder } from "@/lib/nocode/client";
import { isInterval, loadPlans, quote } from "@/lib/plans";

const SYSTEM_TOKEN = process.env.NOCODE_SYSTEM_TOKEN || "";

/** Starts a plan payment. The price is worked out here from the plan; nothing is taken from the browser. */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "CREATOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planId, interval } = await req.json();
    const plan = (await loadPlans()).find((p) => p.id === planId);
    if (!plan || !isInterval(interval)) return NextResponse.json({ error: "Choose a plan" }, { status: 400 });
    if (plan.monthly <= 0) return NextResponse.json({ error: "This plan is free" }, { status: 400 });

    const price = quote(plan, interval);
    const order = await createRazorpayOrder(
      {
        amount: price.total * 100,
        currency: "INR",
        description: `${plan.name} plan (${interval})`,
        metadata: { creator_id: session.user.id, plan_id: plan.id, interval },
      },
      SYSTEM_TOKEN
    );

    await nocodeDb.planPayments.create(
      {
        creator_id: session.user.id,
        plan_id: plan.id,
        billing_interval: interval,
        plan_name: plan.name,
        commission: String(plan.commission),
        base_amount: String(price.base),
        gst_amount: String(price.gst),
        amount: String(price.total),
        status: "pending",
        razorpay_order_id: order.orderId,
      },
      SYSTEM_TOKEN
    );

    return NextResponse.json({
      razorpayOrderId: order.orderId,
      amount: price.total * 100,
      currency: "INR",
      key: order.keyId,
      description: `${plan.name} plan (${interval})`,
    });
  } catch (error) {
    console.error("Plan checkout error:", error);
    return NextResponse.json({ error: "Could not start the payment" }, { status: 500 });
  }
}
