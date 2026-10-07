import { nocodeDb } from "@/lib/nocode/db";

const SYSTEM_TOKEN = process.env.NOCODE_SYSTEM_TOKEN || "";

/** Same rounding as the checkout page, so the amount charged matches the amount shown. */
export function couponDiscountAmount(coupon: Record<string, unknown>, basePrice: number): number {
  const value = Number(coupon.discount_value) || 0;
  return coupon.discount_type === "percentage"
    ? Math.round((basePrice * value) / 100)
    : Math.min(value, basePrice);
}

/** Loads a coupon and checks it can be used for this service right now. */
export async function loadUsableCoupon(
  couponId: string,
  serviceId: string
): Promise<{ coupon: Record<string, unknown> } | { error: string }> {
  const coupon = await nocodeDb.coupons.findUnique({ id: couponId }, SYSTEM_TOKEN).catch(() => null);
  if (!coupon || coupon.status !== "active") return { error: "Invalid coupon code" };

  const now = new Date();
  if (now < new Date(String(coupon.start_date)) || now > new Date(String(coupon.end_date))) {
    return { error: "Coupon has expired" };
  }
  if (coupon.max_usages && Number(coupon.usage_count) >= Number(coupon.max_usages)) {
    return { error: "Coupon usage limit reached" };
  }
  const couponServiceId = String(coupon.service_id || "all");
  if (couponServiceId !== "all" && couponServiceId !== serviceId) {
    return { error: "Coupon not valid for this service" };
  }
  return { coupon };
}

/** Price the learner pays for a service after an optional coupon, with GST on the discounted amount. */
export function serviceTotal(service: Record<string, unknown>, coupon?: Record<string, unknown> | null): number {
  const base = service.discounted_price ? Number(service.discounted_price) : Number(service.price) || 0;
  const afterCoupon = Math.max(0, base - (coupon ? couponDiscountAmount(coupon, base) : 0));
  return afterCoupon + (service.enable_gst ? Math.round(afterCoupon * 0.18) : 0);
}

/** Counts one use of a coupon. Called once the enrollment exists, never for abandoned checkouts. */
export async function redeemCoupon(couponId: string) {
  const coupon = await nocodeDb.coupons.findUnique({ id: couponId }, SYSTEM_TOKEN).catch(() => null);
  if (coupon) {
    await nocodeDb.coupons
      .update(couponId, { usage_count: Number(coupon.usage_count || 0) + 1 }, SYSTEM_TOKEN)
      .catch((e) => console.error("[coupon] could not record usage", e));
  }
}
