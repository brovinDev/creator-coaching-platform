import { NextRequest, NextResponse } from "next/server";
import { nocodeDb } from "@/lib/nocode/db";
import { auth } from "@/lib/auth";
import { resolvePurchase } from "@/lib/checkout";
import { NocodeApiError, createRazorpaySubscription } from "@/lib/nocode/client";
import { BILLING_INTERVALS, ensurePlan, isBillingInterval, isSubscriptionService } from "@/lib/subscription";

const SYSTEM_TOKEN = process.env.NOCODE_SYSTEM_TOKEN || "";

/** Starts a subscription at Razorpay for the signed-in learner. The price always comes from the service. */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Please sign in to continue" }, { status: 401 });
    }

    const { serviceId, couponId } = await req.json();
    if (couponId) return NextResponse.json({ error: "Coupons cannot be used on a subscription yet" }, { status: 400 });

    const service = serviceId ? await nocodeDb.services.findUnique({ id: String(serviceId) }, SYSTEM_TOKEN).catch(() => null) : null;
    if (!service) return NextResponse.json({ error: "Service not found" }, { status: 404 });
    if (!isSubscriptionService(service)) return NextResponse.json({ error: "This service is not a subscription" }, { status: 400 });
    const interval = service.billing_interval;
    if (!isBillingInterval(interval)) return NextResponse.json({ error: "This subscription has no billing interval set" }, { status: 400 });

    // The price (with GST) and the "already subscribed" check are the same as for a one-time purchase.
    const purchase = await resolvePurchase({ userId: session.user.id, serviceId: String(service.id) }, SYSTEM_TOKEN);
    if ("error" in purchase) return NextResponse.json({ error: purchase.error }, { status: purchase.status });

    const amountPaise = purchase.price * 100;
    const planId = await ensurePlan(service, amountPaise, interval);
    const subscription = await createRazorpaySubscription(
      {
        planId,
        totalCount: BILLING_INTERVALS[interval].cycles,
        notes: { user_id: session.user.id, service_id: String(service.id) },
      },
      SYSTEM_TOKEN
    );

    await nocodeDb.serviceSubscriptions.create(
      {
        user_id: session.user.id,
        service_id: String(service.id),
        creator_id: String(service.creator_id || ""),
        razorpay_subscription_id: subscription.subscriptionId,
        status: "created",
        billing_interval: interval,
        amount: String(purchase.price),
        paid_count: "0",
        access: "off",
      },
      SYSTEM_TOKEN
    );

    return NextResponse.json({
      subscriptionId: subscription.subscriptionId,
      key: subscription.keyId,
      amount: amountPaise,
      currency: "INR",
    });
  } catch (error) {
    console.error("Create subscription error:", error);
    // The payment provider said no (for instance Subscriptions is not switched on for the account).
    // Learners get a plain message; the real reason is shown outside production to help set up.
    if (error instanceof NocodeApiError) {
      const detail = process.env.NODE_ENV === "production" ? "" : ` (${error.message})`;
      return NextResponse.json({ error: `Subscriptions are not available right now. Please try again later.${detail}` }, { status: 502 });
    }
    return NextResponse.json({ error: "Failed to start the subscription" }, { status: 500 });
  }
}
