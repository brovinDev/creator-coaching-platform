import { NextRequest, NextResponse } from "next/server";
import { auth, getNocodeToken } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";

/** Information-tab settings: text columns, and switches kept as 'true'/'false'. */
const TEXT_SETTINGS = [
  { api: "instructor", db: "instructor" },
  { api: "durationHours", db: "duration_hours" },
  { api: "durationMinutes", db: "duration_minutes" },
  { api: "defaultThumbnail", db: "default_thumbnail" },
  { api: "validityDays", db: "validity_days" },
];
const SWITCH_SETTINGS = [
  { api: "showAsLocked", db: "show_as_locked" },
  { api: "disableQna", db: "disable_qna" },
  { api: "disableComments", db: "disable_comments" },
];

function settingsOut(c: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const k of TEXT_SETTINGS) out[k.api] = typeof c[k.db] === "string" ? c[k.db] : "";
  for (const k of SWITCH_SETTINGS) out[k.api] = c[k.db] === true || c[k.db] === "true";
  return out;
}

function mapLesson(l: Record<string, unknown>) {
  return {
    id: l.id,
    title: l.title,
    content: l.content,
    videoUrl: l.video_url,
    thumbnail: l.thumbnail,
    position: l.position,
    moduleId: l.module_id,
    resources: l.resources || null,
    isFree: l.is_free === true || l.is_free === "true",
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
  const profile = await nocodeDb.userProfiles.findUnique({ user_id: session.user.id }, token).catch(() => null);
  const creatorName = profile
    ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Creator"
    : "Creator";

  return NextResponse.json({
    id: course.id,
    title: course.title,
    description: course.description,
    price: course.price,
    slug: course.slug,
    published: course.published,
    thumbnail: course.thumbnail,
    creatorId: course.creator_id,
    creatorName,
    ...settingsOut(course),
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
    if (data.thumbnail !== undefined) updateFields.thumbnail = data.thumbnail;
    if (data.published !== undefined) updateFields.published = data.published;
    for (const key of TEXT_SETTINGS) {
      if (data[key.api] !== undefined) updateFields[key.db] = String(data[key.api] ?? "");
    }
    for (const key of SWITCH_SETTINGS) {
      if (data[key.api] !== undefined) updateFields[key.db] = data[key.api] ? "true" : "false";
    }

    await nocodeDb.courses.update(courseId, updateFields, token);

    return NextResponse.json({
      id: courseId,
      title: data.title ?? course.title,
      description: data.description ?? course.description,
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
