import { NextRequest, NextResponse } from "next/server";
import { auth, getNocodeToken } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = await getNocodeToken();

  // Get all modules for this course, then all lessons for those modules
  const modules = await nocodeDb.courseModules.findMany(
    { where: { course_id: courseId } },
    token
  );
  const moduleIds = modules.map((m) => String(m.id));

  // Get all lessons belonging to these modules
  const allLessons: Record<string, unknown>[] = [];
  for (const mid of moduleIds) {
    const lessons = await nocodeDb.lessons.findMany(
      { where: { module_id: mid }, select: ["id"] },
      token
    );
    allLessons.push(...lessons);
  }
  const lessonIds = allLessons.map((l) => String(l.id));

  // Get completed progress for this user
  const allProgress: Array<{ lessonId: string }> = [];
  for (const lid of lessonIds) {
    const progress = await nocodeDb.lessonProgress.findUnique(
      { user_id: session.user.id, lesson_id: lid, completed: true },
      token
    );
    if (progress) allProgress.push({ lessonId: lid });
  }

  return NextResponse.json(allProgress);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = await getNocodeToken();

  const enrollment = await nocodeDb.enrollments.findUnique(
    { user_id: session.user.id, course_id: courseId },
    token
  );
  if (!enrollment) return NextResponse.json({ error: "Not enrolled" }, { status: 403 });

  const { lessonId, completed } = await req.json();

  // Upsert: check if progress record exists
  const existing = await nocodeDb.lessonProgress.findUnique(
    { user_id: session.user.id, lesson_id: lessonId },
    token
  );

  if (existing) {
    await nocodeDb.lessonProgress.update(String(existing.id), { completed }, token);
  } else {
    await nocodeDb.lessonProgress.create(
      { user_id: session.user.id, lesson_id: lessonId, completed },
      token
    );
  }

  return NextResponse.json({ success: true });
}
