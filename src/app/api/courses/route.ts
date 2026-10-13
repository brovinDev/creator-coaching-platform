import { NextRequest, NextResponse } from "next/server";
import { auth, getNocodeToken } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";
import { slugify } from "@/lib/utils";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = await getNocodeToken();
  const courses = await nocodeDb.courses.findMany(
    { where: { creator_id: session.user.id }, orderBy: { created_at: "desc" } },
    token
  );

  const profile = await nocodeDb.userProfiles
    .findUnique({ user_id: session.user.id }, token)
    .catch(() => null);
  const creatorName = profile
    ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Creator"
    : "Creator";

  // Which services each course is part of, for the Reorder panel.
  const services = await nocodeDb.services.findMany({ where: { creator_id: session.user.id } }, token);
  const servicesOf = new Map<string, string[]>();
  for (const svc of services) {
    for (const cid of String(svc.course_id || "").split(",").map((x) => x.trim()).filter(Boolean)) {
      servicesOf.set(cid, [...(servicesOf.get(cid) ?? []), String(svc.title || "")]);
    }
  }

  const enriched = await Promise.all(
    courses.map(async (c) => {
      const modules = await nocodeDb.courseModules.findMany(
        { where: { course_id: String(c.id) } },
        token
      );
      let lessonCount = 0;
      for (const m of modules) {
        lessonCount += await nocodeDb.lessons.count({ module_id: String(m.id) }, token);
      }
      return {
        id: c.id,
        title: c.title,
        description: c.description,
        slug: c.slug,
        published: c.published,
        thumbnail: c.thumbnail,
        creatorId: c.creator_id,
        creatorName,
        createdAt: c.created_at,
        position: c.position === undefined || c.position === null || c.position === "" ? null : Number(c.position),
        services: servicesOf.get(String(c.id)) ?? [],
        _count: { sections: modules.length, lectures: lessonCount },
      };
    })
  );

  // The creator's own order first; courses never ordered keep newest-first after them.
  enriched.sort((a, b) => (a.position ?? Infinity) - (b.position ?? Infinity));

  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CREATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, description, thumbnail } = await req.json();
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const token = await getNocodeToken();

  let slug = slugify(title);
  const existing = await nocodeDb.courses.findUnique({ slug }, token);
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  const course = await nocodeDb.courses.create(
    {
      title,
      slug,
      description: description || "",
      price: 0,
      thumbnail: thumbnail || null,
      published: false,
      creator_id: session.user.id,
    },
    token
  );

  return NextResponse.json({
    id: course.id,
    title: course.title,
    slug: course.slug,
    description: course.description,
    price: course.price,
    thumbnail: course.thumbnail,
    published: course.published,
    creatorId: course.creator_id,
  });
}
