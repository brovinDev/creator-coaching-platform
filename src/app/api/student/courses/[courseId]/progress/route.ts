import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lessons = await db.lesson.findMany({
    where: { module: { courseId } },
    select: { id: true },
  });
  const lessonIds = lessons.map((l) => l.id);

  const progress = await db.lessonProgress.findMany({
    where: {
      userId: session.user.id,
      lessonId: { in: lessonIds },
      completed: true,
    },
    select: { lessonId: true },
  });

  return NextResponse.json(progress);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId: session.user.id, courseId } },
  });
  if (!enrollment) return NextResponse.json({ error: "Not enrolled" }, { status: 403 });

  const { lessonId, completed } = await req.json();

  await db.lessonProgress.upsert({
    where: { userId_lessonId: { userId: session.user.id, lessonId } },
    update: { completed },
    create: { userId: session.user.id, lessonId, completed },
  });

  return NextResponse.json({ success: true });
}
