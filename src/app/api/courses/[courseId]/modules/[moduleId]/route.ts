import { NextRequest, NextResponse } from "next/server";
import { auth, getNocodeToken } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";

type Params = { params: Promise<{ courseId: string; moduleId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { courseId, moduleId } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "CREATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await getNocodeToken();
  const course = await nocodeDb.courses.findUnique({ id: courseId, creator_id: session.user.id }, token);
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { title } = await req.json();
  const updated = await nocodeDb.courseModules.update(moduleId, { title }, token);

  return NextResponse.json({
    id: updated.id ?? moduleId,
    title: updated.title ?? title,
    position: updated.position,
    courseId: updated.course_id ?? courseId,
  });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { courseId, moduleId } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "CREATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await getNocodeToken();
  const course = await nocodeDb.courses.findUnique({ id: courseId, creator_id: session.user.id }, token);
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await nocodeDb.lessons.deleteWhere({ module_id: moduleId }, token);
  await nocodeDb.courseModules.delete(moduleId, token);

  return NextResponse.json({ message: "Deleted" });
}
