import { NextRequest, NextResponse } from "next/server";
import { auth, getNocodeToken } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { serviceId } = await params;
  const token = await getNocodeToken();
  const service = await nocodeDb.services.findUnique({ id: serviceId }, token);

  if (!service || service.creator_id !== session.user.id) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  let activeUsers = 0;
  const serviceEnrollCount = await nocodeDb.enrollments.count({ service_id: serviceId }, token);
  activeUsers += serviceEnrollCount;
  const courseIdsStr = (service.course_id as string) || "";
  const courseIds = courseIdsStr ? courseIdsStr.split(",").filter(Boolean) : [];
  for (const cid of courseIds) {
    activeUsers += await nocodeDb.enrollments.count({ course_id: cid.trim() }, token);
  }

  return NextResponse.json({
    ...service,
    active_users: activeUsers,
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CREATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { serviceId } = await params;
  const token = await getNocodeToken();
  const service = await nocodeDb.services.findUnique({ id: serviceId }, token);

  if (!service || service.creator_id !== session.user.id) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  const body = await req.json();
  const allowedFields = [
    "title", "description", "cover_image", "service_type", "billing_interval", "status",
    "currency", "price", "discounted_price", "start_date", "enable_gst",
    "payment_success_message", "published", "course_id",
    "payment_config", "success_config",
  ];

  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) updates[field] = body[field];
  }

  try {
    const updated = await nocodeDb.services.update(serviceId, updates, token);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("[SERVICE PUT ERROR]", error);
    const msg = error instanceof Error ? error.message : "Failed to update service";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CREATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { serviceId } = await params;
  const token = await getNocodeToken();
  const service = await nocodeDb.services.findUnique({ id: serviceId }, token);

  if (!service || service.creator_id !== session.user.id) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  await nocodeDb.services.delete(serviceId, token);
  return NextResponse.json({ message: "Service deleted" });
}
