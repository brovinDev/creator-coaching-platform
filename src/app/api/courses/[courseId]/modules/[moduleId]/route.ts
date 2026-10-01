import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ courseId: string; moduleId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { courseId, moduleId } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "CREATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const course = await db.course.findUnique({ where: { id: courseId, creatorId: session.user.id } });
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { title } = await req.json();
  const updated = await db.courseModule.update({
    where: { id: moduleId },
    data: { title },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { courseId, moduleId } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "CREATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const course = await db.course.findUnique({ where: { id: courseId, creatorId: session.user.id } });
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.courseModule.delete({ where: { id: moduleId } });
  return NextResponse.json({ message: "Deleted" });
}
