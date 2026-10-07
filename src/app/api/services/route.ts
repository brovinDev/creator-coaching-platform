import { NextRequest, NextResponse } from "next/server";
import { auth, getNocodeToken } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";
import { slugify } from "@/lib/utils";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = await getNocodeToken();
  const services = await nocodeDb.services.findMany(
    { where: { creator_id: session.user.id }, orderBy: { created_at: "desc" } },
    token
  );

  const enriched = await Promise.all(
    services.map(async (s) => {
      let activeUsers = 0;
      activeUsers += await nocodeDb.enrollments.count({ service_id: String(s.id) }, token);
      const courseIdsStr = (s.course_id as string) || "";
      const courseIdsList = courseIdsStr ? courseIdsStr.split(",").filter(Boolean) : [];
      for (const cid of courseIdsList) {
        activeUsers += await nocodeDb.enrollments.count({ course_id: cid.trim() }, token);
      }
      return {
        id: s.id,
        title: s.title,
        description: s.description,
        cover_image: s.cover_image,
        service_type: s.service_type,
        status: s.status,
        currency: s.currency,
        price: s.price,
        discounted_price: s.discounted_price,
        start_date: s.start_date,
        slug: s.slug,
        creator_id: s.creator_id,
        course_id: s.course_id,
        enable_gst: s.enable_gst,
        payment_success_message: s.payment_success_message,
        published: s.published,
        created_at: s.created_at,
        active_users: activeUsers,
      };
    })
  );

  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CREATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { title, service_type } = body;

  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (!service_type) return NextResponse.json({ error: "Service type is required" }, { status: 400 });

  const token = await getNocodeToken();

  let slug = slugify(title);
  const existing = await nocodeDb.services.findUnique({ slug }, token);
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  const service = await nocodeDb.services.create(
    {
      title,
      slug,
      description: body.description || "",
      cover_image: body.cover_image || null,
      service_type,
      status: "ACTIVE",
      currency: body.currency || "INR",
      price: body.price || 0,
      discounted_price: body.discounted_price || null,
      start_date: body.start_date || new Date().toISOString(),
      creator_id: session.user.id,
      course_id: body.course_id || null,
      enable_gst: body.enable_gst || false,
      payment_success_message: body.payment_success_message || "",
      payment_config: body.payment_config || null,
      success_config: body.success_config || null,
      published: false,
    },
    token
  );

  return NextResponse.json({
    id: service.id,
    title: service.title,
    slug: service.slug,
    service_type: service.service_type,
    status: service.status,
    price: service.price,
    currency: service.currency,
    created_at: service.created_at,
  });
}
