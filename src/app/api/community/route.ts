import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user.role === "CREATOR") {
    const community = await db.community.findUnique({
      where: { creatorId: session.user.id },
      include: {
        channels: {
          orderBy: { position: "asc" },
          include: { _count: { select: { posts: true } } },
        },
      },
    });
    return NextResponse.json(community ? [community] : []);
  }

  const enrollments = await db.enrollment.findMany({
    where: { userId: session.user.id },
    include: { course: { select: { creatorId: true } } },
  });

  const creatorIds = [...new Set(enrollments.map((e) => e.course.creatorId))];

  const communities = await db.community.findMany({
    where: { creatorId: { in: creatorIds } },
    include: {
      channels: {
        orderBy: { position: "asc" },
        include: { _count: { select: { posts: true } } },
      },
    },
  });

  return NextResponse.json(communities);
}
