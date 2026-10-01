import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ courseSlug: string }> }) {
  const { courseSlug } = await params;

  const course = await db.course.findUnique({
    where: { slug: courseSlug },
    include: { creator: { select: { name: true } } },
  });

  if (!course || !course.published) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: course.id,
    title: course.title,
    description: course.description,
    thumbnail: course.thumbnail,
    price: course.price,
    slug: course.slug,
    creator: course.creator,
  });
}
