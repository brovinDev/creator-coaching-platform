import { NextRequest, NextResponse } from "next/server";
import { nocodeDb } from "@/lib/nocode/db";

const SYSTEM_TOKEN = process.env.NOCODE_SYSTEM_TOKEN || "";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ serviceSlug: string }> }
) {
  const { serviceSlug } = await params;

  let service = await nocodeDb.services.findUnique({ slug: serviceSlug }, SYSTEM_TOKEN);
  if (!service) {
    service = await nocodeDb.services.findUnique({ id: serviceSlug }, SYSTEM_TOKEN).catch(() => null);
  }
  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  const creatorProfile = await nocodeDb.userProfiles
    .findUnique({ user_id: String(service.creator_id) }, SYSTEM_TOKEN)
    .catch(() => null);

  const creatorName =
    creatorProfile
      ? `${creatorProfile.first_name || ""} ${creatorProfile.last_name || ""}`.trim() || "Creator"
      : "Creator";

  const logoUrl = creatorProfile?.avatar || null;

  return NextResponse.json({
    id: service.id,
    title: service.title,
    description: service.description,
    cover_image: service.cover_image,
    service_type: service.service_type,
    price: service.price,
    discounted_price: service.discounted_price,
    currency: service.currency,
    slug: service.slug,
    enable_gst: service.enable_gst,
    course_id: service.course_id,
    payment_config: service.payment_config,
    success_config: service.success_config,
    creator: {
      name: creatorName,
      logo: logoUrl,
    },
  });
}
