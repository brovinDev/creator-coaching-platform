import { NextRequest, NextResponse } from "next/server";
import { auth, getNocodeToken } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";

const SYSTEM_TOKEN = process.env.NOCODE_SYSTEM_TOKEN || "";

export async function POST(req: NextRequest) {
  const { code, serviceId } = await req.json();
  const session = await auth();

  if (!code) {
    return NextResponse.json({ error: "Coupon code is required" }, { status: 400 });
  }

  const coupons = await nocodeDb.coupons.findMany(
    { where: { code: code.toUpperCase(), status: "active" } },
    SYSTEM_TOKEN
  );

  const coupon = coupons[0];
  if (!coupon) {
    return NextResponse.json({ error: "Invalid coupon code" }, { status: 404 });
  }

  const now = new Date();
  const start = new Date(String(coupon.start_date));
  const end = new Date(String(coupon.end_date));

  if (now < start || now > end) {
    return NextResponse.json({ error: "Coupon has expired" }, { status: 400 });
  }

  if (coupon.max_usages && Number(coupon.usage_count) >= Number(coupon.max_usages)) {
    return NextResponse.json({ error: "Coupon usage limit reached" }, { status: 400 });
  }

  const couponServiceId = String(coupon.service_id || "all");
  if (serviceId && couponServiceId !== "all" && couponServiceId !== String(serviceId)) {
    return NextResponse.json({ error: "Coupon not valid for this service" }, { status: 400 });
  }

  const targetCustomer = String(coupon.target_customer || "all");
  if (targetCustomer !== "all" && session?.user?.id) {
    const targetServiceIds = targetCustomer.split(",").filter(Boolean);
    const token = await getNocodeToken();
    const enrollments = await nocodeDb.enrollments.findMany(
      { where: { user_id: session.user.id } },
      token
    );
    const enrolledServiceIds = enrollments
      .map((e) => String(e.service_id || ""))
      .filter(Boolean);
    const hasMatchingPurchase = targetServiceIds.some((id) => enrolledServiceIds.includes(id));
    if (!hasMatchingPurchase) {
      return NextResponse.json({ error: "This coupon is not available for your account" }, { status: 400 });
    }
  }

  return NextResponse.json({
    valid: true,
    couponId: coupon.id,
    code: coupon.code,
    discount_type: coupon.discount_type,
    discount_value: Number(coupon.discount_value),
  });
}
