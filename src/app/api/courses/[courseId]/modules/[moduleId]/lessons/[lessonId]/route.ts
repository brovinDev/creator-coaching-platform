import { NextRequest, NextResponse } from "next/server";
import { auth, getNocodeToken } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";

type Params = { params: Promise<{ courseId: string; moduleId: string; lessonId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { courseId, lessonId } = await params;
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
  if (data.content !== undefined) updateFields.content = data.content;
  if (data.videoUrl !== undefined) updateFields.video_url = data.videoUrl;
  if (data.thumbnail !== undefined) updateFields.thumbnail = data.thumbnail;

  const updated = await nocodeDb.lessons.update(lessonId, updateFields, token);

  return NextResponse.json({
    id: updated.id ?? lessonId,
    title: updated.title,
    content: updated.content,
    videoUrl: updated.video_url,
    thumbnail: updated.thumbnail,
    position: updated.position,
    moduleId: updated.module_id,
  });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { courseId, lessonId } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "CREATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await getNocodeToken();
  const course = await nocodeDb.courses.findUnique({ id: courseId, creator_id: session.user.id }, token);
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await nocodeDb.lessons.delete(lessonId, token);
  return NextResponse.json({ message: "Deleted" });
}
