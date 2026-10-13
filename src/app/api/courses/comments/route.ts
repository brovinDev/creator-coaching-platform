import { NextRequest, NextResponse } from "next/server";
import { auth, getNocodeToken } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";
import { authorsFor } from "@/lib/comment-authors";

type Row = Record<string, unknown>;

const text = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
const isTopLevelComment = (c: Row) => !text(c.parent_id) && text(c.kind) !== "question";
const isRead = (c: Row) => c.is_read === true || c.is_read === "true";

/** The signed-in creator, or null. */
async function creator() {
  const session = await auth();
  return session?.user && session.user.role === "CREATOR" ? session.user : null;
}

/** Comments on every course of this creator, newest first. `?summary=1` returns only the unread count. */
export async function GET(req: NextRequest) {
  const user = await creator();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = await getNocodeToken();
  const courses = await nocodeDb.courses.findMany({ where: { creator_id: user.id } }, token);
  const courseIds = new Set(courses.map((c) => String(c.id)));

  // One course at a time: the module has no "course in (...)" filter.
  const perCourse = await Promise.all(
    [...courseIds].map((cid) =>
      nocodeDb.lessonComments.findMany({ where: { course_id: cid }, orderBy: { created_at: "desc" } }, token)
    )
  );
  const top = perCourse.flat().filter(isTopLevelComment);

  if (req.nextUrl.searchParams.get("summary")) {
    return NextResponse.json({ unread: top.filter((c) => !isRead(c)).length });
  }

  top.sort((a, b) => text(b.created_at).localeCompare(text(a.created_at)));

  const courseTitle = new Map(courses.map((c) => [String(c.id), text(c.title)]));
  const chapterTitle = new Map<string, string>();
  for (const cid of courseIds) {
    const modules = await nocodeDb.courseModules.findMany({ where: { course_id: cid } }, token);
    for (const m of modules) {
      const lessons = await nocodeDb.lessons.findMany({ where: { module_id: String(m.id) } }, token);
      for (const l of lessons) chapterTitle.set(String(l.id), text(l.title));
    }
  }

  const authors = await authorsFor(top.map((c) => text(c.user_id)), token);

  return NextResponse.json({
    courses: courses.map((c) => ({ id: String(c.id), title: text(c.title) })),
    comments: top.map((c) => {
      const author = authors.get(text(c.user_id));
      return {
        id: String(c.id),
        courseId: text(c.course_id),
        content: text(c.content),
        userId: text(c.user_id),
        userName: author?.name || "Student",
        userAvatar: author?.avatar ?? null,
        courseTitle: courseTitle.get(text(c.course_id)) || "",
        chapterTitle: chapterTitle.get(text(c.lesson_id)) || "",
        createdAt: text(c.created_at) || null,
        isRead: isRead(c),
      };
    }),
  });
}

/** Mark threads read or unread across courses: { ids: string[], read: boolean }. */
export async function PATCH(req: NextRequest) {
  const user = await creator();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ids, read } = await req.json().catch(() => ({}));
  if (!Array.isArray(ids) || typeof read !== "boolean") {
    return NextResponse.json({ error: "ids and read are required" }, { status: 400 });
  }

  const token = await getNocodeToken();
  const mine = new Set(
    (await nocodeDb.courses.findMany({ where: { creator_id: user.id } }, token)).map((c) => String(c.id))
  );

  await Promise.all(
    ids.map(async (id: unknown) => {
      const comment = await nocodeDb.lessonComments.findUnique({ id: text(id) }, token);
      if (comment && mine.has(text(comment.course_id)) && isTopLevelComment(comment)) {
        await nocodeDb.lessonComments.update(String(comment.id), { is_read: read ? "true" : "false" }, token);
      }
    })
  );

  return NextResponse.json({ ok: true });
}
