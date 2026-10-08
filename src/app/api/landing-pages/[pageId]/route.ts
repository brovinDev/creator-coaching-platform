import { NextRequest, NextResponse } from "next/server";
import { auth, getNocodeToken } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = await getNocodeToken();

  const page = await nocodeDb.landingPages.findUnique({ id: pageId }, token);
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const course = await nocodeDb.courses.findUnique({ id: String(page.course_id) }, token);
  if (!course || String(course.creator_id) !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const sections = await nocodeDb.landingPageSections.findMany(
    { where: { landing_page_id: pageId }, orderBy: { position: "asc" } },
    token
  );

  return NextResponse.json({
    ...page,
    courseId: page.course_id,
    metaPixelId: page.meta_pixel_id,
    course: {
      title: course.title,
      price: course.price,
      creatorId: course.creator_id,
      slug: course.slug,
      description: course.description,
      thumbnail: course.thumbnail,
    },
    sections: sections.map((s) => ({
      ...s,
      content: typeof s.content === "string" ? JSON.parse(s.content as string) : s.content,
    })),
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "CREATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await getNocodeToken();

  const page = await nocodeDb.landingPages.findUnique({ id: pageId }, token);
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const course = await nocodeDb.courses.findUnique({ id: String(page.course_id) }, token);
  if (!course || String(course.creator_id) !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data = await req.json();

  if (data.sections) {
    for (const section of data.sections) {
      if (section.id) {
        await nocodeDb.landingPageSections.update(
          String(section.id),
          {
            content: section.content,
            visible: section.visible,
            position: section.position,
          },
          token
        );
      }
    }
  }

  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.published !== undefined) updateData.published = data.published;
  if (data.metaPixelId !== undefined) updateData.meta_pixel_id = data.metaPixelId;

  if (Object.keys(updateData).length > 0) {
    await nocodeDb.landingPages.update(pageId, updateData, token);
  }

  const updated = await nocodeDb.landingPages.findUnique({ id: pageId }, token);
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "CREATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await getNocodeToken();

  const page = await nocodeDb.landingPages.findUnique({ id: pageId }, token);
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const course = await nocodeDb.courses.findUnique({ id: String(page.course_id) }, token);
  if (!course || String(course.creator_id) !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await nocodeDb.landingPageSections.deleteWhere({ landing_page_id: pageId }, token);
  await nocodeDb.landingPages.delete(pageId, token);
  return NextResponse.json({ message: "Deleted" });
}
