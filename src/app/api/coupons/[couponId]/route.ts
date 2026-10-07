import { NextRequest, NextResponse } from "next/server";
import { auth, getNocodeToken } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";

type Params = { params: Promise<{ couponId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { couponId } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "CREATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await getNocodeToken();
  const coupon = await nocodeDb.coupons.findUnique({ id: couponId }, token);
  if (!coupon || coupon.creator_id !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const updateFields: Record<string, unknown> = {};
  if (body.code !== undefined) updateFields.code = body.code.toUpperCase();
  if (body.service_id !== undefined) updateFields.service_id = body.service_id;
  if (body.discount_type !== undefined) updateFields.discount_type = body.discount_type;
  if (body.discount_value !== undefined) updateFields.discount_value = Number(body.discount_value);
  if (body.max_usages !== undefined) updateFields.max_usages = body.max_usages ? Number(body.max_usages) : null;
  if (body.start_date !== undefined) updateFields.start_date = body.start_date;
  if (body.end_date !== undefined) updateFields.end_date = body.end_date;
  if (body.status !== undefined) updateFields.status = body.status;
  if (body.target_customer !== undefined) updateFields.target_customer = body.target_customer;

  const updated = await nocodeDb.coupons.update(couponId, updateFields, token);
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { couponId } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "CREATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await getNocodeToken();
  const coupon = await nocodeDb.coupons.findUnique({ id: couponId }, token);
  if (!coupon || coupon.creator_id !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await nocodeDb.coupons.delete(couponId, token);
  return NextResponse.json({ message: "Deleted" });
}
