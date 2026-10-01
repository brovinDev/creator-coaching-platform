import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const page = await db.landingPage.findUnique({
    where: { id: pageId },
    include: {
      course: { select: { title: true, price: true, creatorId: true, slug: true, description: true, thumbnail: true } },
      sections: { orderBy: { position: "asc" } },
    },
  });

  if (!page || page.course.creatorId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(page);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "CREATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const page = await db.landingPage.findUnique({
    where: { id: pageId },
    include: { course: { select: { creatorId: true } } },
  });
  if (!page || page.course.creatorId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data = await req.json();

  if (data.sections) {
    for (const section of data.sections) {
      if (section.id) {
        await db.landingPageSection.update({
          where: { id: section.id },
          data: {
            content: section.content,
            visible: section.visible,
            position: section.position,
          },
        });
      }
    }
  }

  const updated = await db.landingPage.update({
    where: { id: pageId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.published !== undefined && { published: data.published }),
      ...(data.metaPixelId !== undefined && { metaPixelId: data.metaPixelId }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "CREATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const page = await db.landingPage.findUnique({
    where: { id: pageId },
    include: { course: { select: { creatorId: true } } },
  });
  if (!page || page.course.creatorId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.landingPage.delete({ where: { id: pageId } });
  return NextResponse.json({ message: "Deleted" });
}
