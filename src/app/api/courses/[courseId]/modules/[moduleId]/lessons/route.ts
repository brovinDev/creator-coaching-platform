import { NextRequest, NextResponse } from "next/server";
import { auth, getNocodeToken } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";

type Params = { params: Promise<{ courseId: string; moduleId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { courseId, moduleId } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "CREATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await getNocodeToken();
  const course = await nocodeDb.courses.findUnique({ id: courseId, creator_id: session.user.id }, token);
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { title, content, videoUrl, thumbnail } = await req.json();
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const existing = await nocodeDb.lessons.findMany(
    { where: { module_id: moduleId }, orderBy: { position: "desc" }, take: 1 },
    token
  );
  const maxPos = existing.length > 0 ? Number(existing[0].position ?? -1) : -1;

  const lesson = await nocodeDb.lessons.create(
    {
      title,
      content: content || "",
      video_url: videoUrl || null,
      thumbnail: thumbnail || null,
      module_id: moduleId,
      position: maxPos + 1,
    },
    token
  );

  return NextResponse.json({
    id: lesson.id,
    title: lesson.title,
    content: lesson.content,
    videoUrl: lesson.video_url,
    thumbnail: lesson.thumbnail,
    position: lesson.position,
    moduleId: lesson.module_id,
  });
}
