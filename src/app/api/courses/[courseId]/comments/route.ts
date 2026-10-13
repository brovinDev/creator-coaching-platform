import { NextRequest, NextResponse } from "next/server";
import { auth, getNocodeToken } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";
import { hasEnrollmentAccess } from "@/lib/enrollment";
import { authorsFor } from "@/lib/comment-authors";

type Row = Record<string, unknown>;
type Params = { params: Promise<{ courseId: string }> };

const text = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
const isTopLevel = (c: Row) => !text(c.parent_id);
const kindOf = (c: Row) => (text(c.kind) === "question" ? "question" : "comment");

/** Every comment thread on this course, newest first, for the creator's Comments tab. */
export async function GET(req: NextRequest, { params }: Params) {
  const kind = req.nextUrl.searchParams.get("kind") === "question" ? "question" : "comment";
  const { courseId } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "CREATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await getNocodeToken();
  const course = await nocodeDb.courses.findUnique({ id: courseId, creator_id: session.user.id }, token);
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rows = await nocodeDb.lessonComments.findMany(
    { where: { course_id: courseId }, orderBy: { created_at: "desc" } },
    token
  );
  const top = rows.filter((c) => isTopLevel(c) && kindOf(c) === kind);

  // Chapter names for the table.
  const modules = await nocodeDb.courseModules.findMany({ where: { course_id: courseId } }, token);
  const chapterTitle = new Map<string, string>();
  for (const m of modules) {
    const lessons = await nocodeDb.lessons.findMany({ where: { module_id: String(m.id) } }, token);
    for (const l of lessons) chapterTitle.set(String(l.id), text(l.title));
  }

  const authors = await authorsFor(top.map((c) => text(c.user_id)), token);
  const replyCount = new Map<string, number>();
  for (const r of rows) {
    if (!isTopLevel(r)) replyCount.set(text(r.parent_id), (replyCount.get(text(r.parent_id)) ?? 0) + 1);
  }

  return NextResponse.json({
    courseTitle: text(course.title),
    comments: top.map((c) => {
      const author = authors.get(text(c.user_id));
      return {
        id: String(c.id),
        content: text(c.content),
        userId: text(c.user_id),
        userName: author?.name || "Student",
        userAvatar: author?.avatar ?? null,
        lessonId: text(c.lesson_id),
        chapterTitle: chapterTitle.get(text(c.lesson_id)) || "",
        createdAt: text(c.created_at) || null,
        isRead: c.is_read === true || c.is_read === "true",
        replies: replyCount.get(String(c.id)) ?? 0,
      };
    }),
  });
}

/** Post a comment or a reply. The creator, or a learner enrolled in the course (unless comments are switched off). */
export async function POST(req: NextRequest, { params }: Params) {
  const { courseId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = await getNocodeToken();
  const course = await nocodeDb.courses.findUnique({ id: courseId }, token);
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isCreator = course.creator_id === session.user.id;
  const body = await req.json().catch(() => ({}));
  if (!isCreator) {
    const off = (v: unknown) => v === true || v === "true";
    if (body.kind === "question" ? off(course.disable_qna) : off(course.disable_comments)) {
      return NextResponse.json(
        { error: body.kind === "question" ? "QnA is turned off for this course" : "Comments are turned off for this course" },
        { status: 403 }
      );
    }
    if (!(await hasEnrollmentAccess(session.user.id, courseId, token))) {
      return NextResponse.json({ error: "Not enrolled" }, { status: 403 });
    }
  }

  const content = text(body.content).trim();
  if (!content) return NextResponse.json({ error: "Write something first" }, { status: 400 });
  if (content.length > 2000) return NextResponse.json({ error: "Comments can be up to 2000 characters" }, { status: 400 });

  let lessonId = text(body.lessonId);
  const parentId = text(body.parentId);
  if (parentId) {
    const parent = await nocodeDb.lessonComments.findUnique({ id: parentId, course_id: courseId }, token);
    if (!parent || !isTopLevel(parent)) return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    lessonId = text(parent.lesson_id);
  }
  // A reply belongs to the same tab as the thread it answers.
  const kind = parentId ? kindOf((await nocodeDb.lessonComments.findUnique({ id: parentId }, token)) ?? {}) : body.kind === "question" ? "question" : "comment";
  if (!lessonId) return NextResponse.json({ error: "Chapter is required" }, { status: 400 });

  const created = await nocodeDb.lessonComments.create(
    {
      course_id: courseId,
      lesson_id: lessonId,
      user_id: session.user.id,
      parent_id: parentId,
      kind,
      content,
      // A learner's new comment is unread for the creator; the creator's own words are read by definition.
      is_read: isCreator ? "true" : "false",
    },
    token
  );

  // A learner replying under a thread makes it unread again; the creator answering marks it read.
  if (parentId) {
    await nocodeDb.lessonComments.update(parentId, { is_read: isCreator ? "true" : "false" }, token);
  }

  return NextResponse.json({ id: String(created.id) });
}

/** Mark threads read or unread: { ids: string[], read: boolean }. */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { courseId } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "CREATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await getNocodeToken();
  const course = await nocodeDb.courses.findUnique({ id: courseId, creator_id: session.user.id }, token);
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { ids, read } = await req.json().catch(() => ({}));
  if (!Array.isArray(ids) || typeof read !== "boolean") {
    return NextResponse.json({ error: "ids and read are required" }, { status: 400 });
  }

  await Promise.all(
    ids.map(async (id: unknown) => {
      const comment = await nocodeDb.lessonComments.findUnique({ id: text(id), course_id: courseId }, token);
      if (comment && isTopLevel(comment)) {
        await nocodeDb.lessonComments.update(String(comment.id), { is_read: read ? "true" : "false" }, token);
      }
    })
  );

  return NextResponse.json({ ok: true });
}
