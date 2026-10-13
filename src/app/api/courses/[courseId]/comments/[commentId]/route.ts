import { NextRequest, NextResponse } from "next/server";
import { auth, getNocodeToken } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";
import { authorsFor } from "@/lib/comment-authors";

const text = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));

/** One comment with all its replies, oldest first, for the creator's thread panel. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ courseId: string; commentId: string }> }) {
  const { courseId, commentId } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "CREATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await getNocodeToken();
  const course = await nocodeDb.courses.findUnique({ id: courseId, creator_id: session.user.id }, token);
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const comment = await nocodeDb.lessonComments.findUnique({ id: commentId, course_id: courseId }, token);
  if (!comment || text(comment.parent_id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const replies = await nocodeDb.lessonComments.findMany(
    { where: { course_id: courseId, parent_id: commentId }, orderBy: { created_at: "asc" } },
    token
  );
  const lesson = await nocodeDb.lessons.findUnique({ id: text(comment.lesson_id) }, token);
  const authors = await authorsFor([text(comment.user_id), ...replies.map((r) => text(r.user_id))], token);

  const shape = (c: Record<string, unknown>) => {
    const author = authors.get(text(c.user_id));
    return {
      id: String(c.id),
      content: text(c.content),
      userName: author?.name || "Student",
      userAvatar: author?.avatar ?? null,
      isCreator: text(c.user_id) === String(course.creator_id),
      createdAt: text(c.created_at) || null,
    };
  };

  return NextResponse.json({
    courseTitle: text(course.title),
    chapterTitle: lesson ? text(lesson.title) : "",
    isRead: comment.is_read === true || comment.is_read === "true",
    comment: shape(comment),
    replies: replies.map(shape),
  });
}

/** Delete a comment and the replies under it. The author or the course's creator may do this. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ courseId: string; commentId: string }> }) {
  const { courseId, commentId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = await getNocodeToken();
  const course = await nocodeDb.courses.findUnique({ id: courseId }, token);
  const comment = await nocodeDb.lessonComments.findUnique({ id: commentId, course_id: courseId }, token);
  if (!course || !comment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allowed = text(comment.user_id) === session.user.id || String(course.creator_id) === session.user.id;
  if (!allowed) return NextResponse.json({ error: "You can only delete your own comments" }, { status: 403 });

  await nocodeDb.lessonComments.deleteWhere({ parent_id: commentId }, token);
  await nocodeDb.lessonComments.delete(commentId, token);
  return NextResponse.json({ ok: true });
}
