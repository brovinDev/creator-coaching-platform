import { NextRequest, NextResponse } from "next/server";
import { auth, getNocodeToken } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "CREATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await getNocodeToken();
  const course = await nocodeDb.courses.findUnique({ id: courseId, creator_id: session.user.id }, token);
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { title } = await req.json();
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const existing = await nocodeDb.courseModules.findMany(
    { where: { course_id: courseId }, orderBy: { position: "desc" }, take: 1 },
    token
  );
  const maxPos = existing.length > 0 ? Number(existing[0].position ?? -1) : -1;

  const mod = await nocodeDb.courseModules.create(
    { title, course_id: courseId, position: maxPos + 1 },
    token
  );

  return NextResponse.json({
    id: mod.id,
    title: mod.title,
    position: mod.position,
    courseId: mod.course_id,
  });
}
