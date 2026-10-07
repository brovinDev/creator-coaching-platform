import { NextRequest, NextResponse } from "next/server";
import { nocodeDb } from "@/lib/nocode/db";

const SYSTEM_TOKEN = process.env.NOCODE_SYSTEM_TOKEN || "";

export async function GET(req: NextRequest, { params }: { params: Promise<{ courseSlug: string }> }) {
  const { courseSlug } = await params;

  const course = await nocodeDb.courses.findUnique({ slug: courseSlug }, SYSTEM_TOKEN);

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  // Fetch creator profile
  const profile = await nocodeDb.userProfiles
    .findUnique({ user_id: String(course.creator_id) }, SYSTEM_TOKEN)
    .catch(() => null);

  return NextResponse.json({
    id: course.id,
    title: course.title,
    description: course.description,
    thumbnail: course.thumbnail,
    price: course.price,
    slug: course.slug,
    creator: { name: profile?.name || profile?.first_name || "Creator" },
  });
}
