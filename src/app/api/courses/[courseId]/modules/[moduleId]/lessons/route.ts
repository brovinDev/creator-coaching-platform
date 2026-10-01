import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ courseId: string; moduleId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { courseId, moduleId } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "CREATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const course = await db.course.findUnique({ where: { id: courseId, creatorId: session.user.id } });
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { title, content, videoUrl, thumbnail } = await req.json();
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const maxPos = await db.lesson.aggregate({
    where: { moduleId },
    _max: { position: true },
  });

  const lesson = await db.lesson.create({
    data: {
      title,
      content: content || "",
      videoUrl: videoUrl || null,
      thumbnail: thumbnail || null,
      moduleId,
      position: (maxPos._max.position ?? -1) + 1,
    },
  });

  return NextResponse.json(lesson);
}
