import { NextRequest, NextResponse } from "next/server";
import { auth, getNocodeToken } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "CREATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await getNocodeToken();
  const coupons = await nocodeDb.coupons.findMany(
    { where: { creator_id: session.user.id }, orderBy: { created_at: "desc" } },
    token
  );

  return NextResponse.json(coupons);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CREATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await getNocodeToken();
  const body = await req.json();
  const { code, service_id, discount_type, discount_value, max_usages, start_date, end_date, target_customer } = body;

  if (!code || !discount_type || discount_value === undefined || !start_date || !end_date) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const existing = await nocodeDb.coupons.findFirst(
    { code: code.toUpperCase(), creator_id: session.user.id },
    token
  );
  if (existing) {
    return NextResponse.json({ error: "Coupon code already exists" }, { status: 400 });
  }

  const coupon = await nocodeDb.coupons.create(
    {
      code: code.toUpperCase(),
      service_id: service_id || "all",
      discount_type,
      discount_value: Number(discount_value),
      max_usages: max_usages ? Number(max_usages) : null,
      usage_count: 0,
      start_date,
      end_date,
      status: "active",
      creator_id: session.user.id,
      target_customer: target_customer || "all",
    },
    token
  );

  return NextResponse.json(coupon);
}
