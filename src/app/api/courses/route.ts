import { NextRequest, NextResponse } from "next/server";
import { auth, getNocodeToken } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";
import { slugify } from "@/lib/utils";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = await getNocodeToken();
  const courses = await nocodeDb.courses.findMany(
    { where: { creator_id: session.user.id }, orderBy: { created_at: "desc" } },
    token
  );

  const enriched = await Promise.all(
    courses.map(async (c) => {
      const enrollmentCount = await nocodeDb.enrollments.count({ course_id: String(c.id) }, token);
      const moduleCount = await nocodeDb.courseModules.count({ course_id: String(c.id) }, token);
      return {
        id: c.id,
        title: c.title,
        description: c.description,
        price: c.price,
        slug: c.slug,
        published: c.published,
        thumbnail: c.thumbnail,
        creatorId: c.creator_id,
        createdAt: c.created_at,
        _count: { enrollments: enrollmentCount, modules: moduleCount },
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

  const { title, description, price, thumbnail } = await req.json();
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const token = await getNocodeToken();

  let slug = slugify(title);
  const existing = await nocodeDb.courses.findUnique({ slug }, token);
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  const course = await nocodeDb.courses.create(
    {
      title,
      slug,
      description: description || "",
      price: price || 0,
      thumbnail: thumbnail || null,
      published: false,
      creator_id: session.user.id,
    },
    token
  );

  return NextResponse.json({
    id: course.id,
    title: course.title,
    slug: course.slug,
    description: course.description,
    price: course.price,
    thumbnail: course.thumbnail,
    published: course.published,
    creatorId: course.creator_id,
  });
}
