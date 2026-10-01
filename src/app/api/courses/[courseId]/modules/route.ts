import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "CREATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const course = await db.course.findUnique({ where: { id: courseId, creatorId: session.user.id } });
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { title } = await req.json();
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const maxPos = await db.courseModule.aggregate({
    where: { courseId },
    _max: { position: true },
  });

  const module = await db.courseModule.create({
    data: {
      title,
      courseId,
      position: (maxPos._max.position ?? -1) + 1,
    },
  });

  return NextResponse.json(module);
}
