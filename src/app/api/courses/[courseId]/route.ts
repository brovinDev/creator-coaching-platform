import { NextRequest, NextResponse } from "next/server";
import { auth, getNocodeToken } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";

function mapLesson(l: Record<string, unknown>) {
  return {
    id: l.id,
    title: l.title,
    content: l.content,
    videoUrl: l.video_url,
    thumbnail: l.thumbnail,
    position: l.position,
    moduleId: l.module_id,
  };
}

function mapModule(m: Record<string, unknown>, lessons: Record<string, unknown>[]) {
  return {
    id: m.id,
    title: m.title,
    position: m.position,
    courseId: m.course_id,
    lessons: lessons.map(mapLesson),
  };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = await getNocodeToken();
  const course = await nocodeDb.courses.findUnique({ id: courseId, creator_id: session.user.id }, token);
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const modules = await nocodeDb.courseModules.findMany(
    { where: { course_id: courseId }, orderBy: { position: "asc" } },
    token
  );

  const modulesWithLessons = await Promise.all(
    modules.map(async (m) => {
      const lessons = await nocodeDb.lessons.findMany(
        { where: { module_id: String(m.id) }, orderBy: { position: "asc" } },
        token
      );
      return mapModule(m, lessons);
    })
  );

  const enrollmentCount = await nocodeDb.enrollments.count({ course_id: courseId }, token);

  return NextResponse.json({
    id: course.id,
    title: course.title,
    description: course.description,
    price: course.price,
    slug: course.slug,
    published: course.published,
    thumbnail: course.thumbnail,
    creatorId: course.creator_id,
    modules: modulesWithLessons,
    _count: { enrollments: enrollmentCount },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  try {
    const { courseId } = await params;
    const session = await auth();
    if (!session?.user || session.user.role !== "CREATOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = await getNocodeToken();
    const course = await nocodeDb.courses.findUnique({ id: courseId, creator_id: session.user.id }, token);
    if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data = await req.json();
    const updateFields: Record<string, unknown> = {};
    if (data.title !== undefined) updateFields.title = data.title;
    if (data.description !== undefined) updateFields.description = data.description;
    if (data.price !== undefined) updateFields.price = data.price;
    if (data.thumbnail !== undefined) updateFields.thumbnail = data.thumbnail;
    if (data.published !== undefined) updateFields.published = data.published;

    await nocodeDb.courses.update(courseId, updateFields, token);

    return NextResponse.json({
      id: courseId,
      title: data.title ?? course.title,
      description: data.description ?? course.description,
      price: data.price ?? course.price,
      slug: course.slug,
      published: data.published ?? course.published,
      thumbnail: data.thumbnail ?? course.thumbnail,
      creatorId: course.creator_id,
    });
  } catch (error) {
    console.error("[COURSE PATCH ERROR]", error);
    const msg = error instanceof Error ? error.message : "Update failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "CREATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await getNocodeToken();
  const course = await nocodeDb.courses.findUnique({ id: courseId, creator_id: session.user.id }, token);
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Delete lessons for all modules first
  const modules = await nocodeDb.courseModules.findMany({ where: { course_id: courseId } }, token);
  for (const m of modules) {
    await nocodeDb.lessons.deleteWhere({ module_id: String(m.id) }, token);
  }
  // Delete modules
  await nocodeDb.courseModules.deleteWhere({ course_id: courseId }, token);
  // Delete enrollments
  await nocodeDb.enrollments.deleteWhere({ course_id: courseId }, token);
  // Delete the course
  await nocodeDb.courses.delete(courseId, token);

  return NextResponse.json({ message: "Deleted" });
}
