import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const courses = await db.course.findMany({
    where: { creatorId: session.user.id },
    include: {
      _count: { select: { enrollments: true, modules: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(courses);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CREATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, description, price, thumbnail } = await req.json();
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  let slug = slugify(title);
  const existing = await db.course.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  const course = await db.course.create({
    data: {
      title,
      slug,
      description: description || "",
      price: price || 0,
      thumbnail: thumbnail || null,
      creatorId: session.user.id,
    },
  });

  return NextResponse.json(course);
}
