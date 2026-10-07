import { NextRequest, NextResponse } from "next/server";
import { auth, getNocodeToken } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";
import { hasEnrollmentAccess } from "@/lib/enrollment";

export async function GET(req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = await getNocodeToken();
  const course = await nocodeDb.courses.findUnique({ id: courseId }, token);
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isCreator = course.creator_id === session.user.id;
  if (!isCreator) {
    const hasAccess = await hasEnrollmentAccess(session.user.id, courseId, token);
    if (!hasAccess) {
      return NextResponse.json({ error: "Not enrolled" }, { status: 403 });
    }
  }

  const modules = await nocodeDb.courseModules.findMany(
    { where: { course_id: courseId }, orderBy: { position: "asc" } },
    token
  );

  const modulesWithLessons = await Promise.all(
    modules.map(async (m) => {
      const lessons = await nocodeDb.lessons.findMany(
        { where: { module_id: String(m.id) }, orderBy: { position: "asc" } },
        token
      );
      return {
        id: m.id,
        title: m.title,
        lessons: lessons.map((l) => ({
          id: l.id,
          title: l.title,
          content: l.content,
          videoUrl: l.video_url,
          thumbnail: l.thumbnail,
          resources: l.resources || null,
        })),
      };
    })
  );

  let creatorName = "Creator";
  let creatorAvatar: string | null = null;
  if (course.creator_id) {
    const profile = await nocodeDb.userProfiles.findFirst({ user_id: String(course.creator_id) }, token);
    if (profile) {
      const fn = String(profile.first_name || "");
      const ln = String(profile.last_name || "");
      creatorName = `${fn} ${ln}`.trim() || "Creator";
      creatorAvatar = (profile.avatar as string) || null;
    }
  }

  return NextResponse.json({
    id: course.id,
    title: course.title,
    description: course.description,
    creatorName,
    creatorAvatar,
    modules: modulesWithLessons,
  });
}
