import { NextRequest, NextResponse } from "next/server";
import { auth, getNocodeToken } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";
import { hasEnrollmentAccess } from "@/lib/enrollment";
import { authorsFor } from "@/lib/comment-authors";

type Row = Record<string, unknown>;

const text = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
const kindOf = (c: Row) => (text(c.kind) === "question" ? "question" : "comment");

/**
 * The comments (or questions, with `?kind=question`) on one chapter, for the person watching it:
 * newest first, each with its replies oldest first. Open to the course's creator and enrolled learners.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ courseId: string; lessonId: string }> }) {
  const { courseId, lessonId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = await getNocodeToken();
  const course = await nocodeDb.courses.findUnique({ id: courseId }, token);
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const creatorId = String(course.creator_id);
  if (creatorId !== session.user.id && !(await hasEnrollmentAccess(session.user.id, courseId, token))) {
    return NextResponse.json({ error: "Not enrolled" }, { status: 403 });
  }

  const kind = req.nextUrl.searchParams.get("kind") === "question" ? "question" : "comment";
  const rows = await nocodeDb.lessonComments.findMany(
    { where: { course_id: courseId, lesson_id: lessonId }, orderBy: { created_at: "asc" } },
    token
  );
  const inKind = rows.filter((r) => kindOf(r) === kind);
  const top = inKind.filter((r) => !text(r.parent_id));

  const authors = await authorsFor([session.user.id, ...inKind.map((r) => text(r.user_id))], token);
  const shape = (r: Row) => {
    const author = authors.get(text(r.user_id));
    return {
      id: String(r.id),
      content: text(r.content),
      userName: author?.name || "Student",
      userAvatar: author?.avatar ?? null,
      createdAt: text(r.created_at) || null,
      mine: text(r.user_id) === session.user.id,
      isCreator: text(r.user_id) === creatorId,
    };
  };

  const me = authors.get(session.user.id);
  return NextResponse.json({
    me: { name: me?.name || session.user.name || "", avatar: me?.avatar ?? null },
    canModerate: creatorId === session.user.id,
    items: top
      .map((c) => ({
        ...shape(c),
        replies: inKind.filter((r) => text(r.parent_id) === String(c.id)).map(shape),
      }))
      .reverse(),
  });
}
