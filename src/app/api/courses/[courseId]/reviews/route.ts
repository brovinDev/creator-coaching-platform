import { NextRequest, NextResponse } from "next/server";
import { auth, getNocodeToken } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";
import { hasEnrollmentAccess } from "@/lib/enrollment";
import { phoneFrom } from "@/lib/enrollment-contact";

type Params = { params: Promise<{ courseId: string }> };

const text = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));

/** Every review of the course, newest first, with the reviewer's name and phone, for the creator's Reviews tab. */
export async function GET(_req: NextRequest, { params }: Params) {
  const { courseId } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "CREATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await getNocodeToken();
  const course = await nocodeDb.courses.findUnique({ id: courseId, creator_id: session.user.id }, token);
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rows = await nocodeDb.courseReviews.findMany(
    { where: { course_id: courseId }, orderBy: { created_at: "desc" } },
    token
  );

  const reviews = await Promise.all(
    rows.map(async (r) => {
      const uid = text(r.user_id);
      const [profile, enrollments] = await Promise.all([
        nocodeDb.userProfiles.findUnique({ user_id: uid }, token).catch(() => null),
        nocodeDb.enrollments.findMany({ where: { user_id: uid } }, token).catch(() => []),
      ]);
      const name = profile ? `${text(profile.first_name)} ${text(profile.last_name)}`.trim() : "";
      return {
        id: String(r.id),
        userName: name || text(profile?.email) || "Student",
        phone: enrollments.map(phoneFrom).find(Boolean) || "",
        rating: Math.min(5, Math.max(0, Math.round(Number(r.rating)) || 0)),
        createdAt: text(r.created_at) || null,
      };
    })
  );

  return NextResponse.json({ reviews });
}

/** A learner rates the course (1-5); rating again replaces their earlier rating. */
export async function POST(req: NextRequest, { params }: Params) {
  const { courseId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = await getNocodeToken();
  const course = await nocodeDb.courses.findUnique({ id: courseId }, token);
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (course.creator_id === session.user.id) {
    return NextResponse.json({ error: "You cannot review your own course" }, { status: 403 });
  }
  if (!(await hasEnrollmentAccess(session.user.id, courseId, token))) {
    return NextResponse.json({ error: "Not enrolled" }, { status: 403 });
  }

  const { rating } = await req.json().catch(() => ({}));
  const stars = Number(rating);
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return NextResponse.json({ error: "Rating must be 1 to 5" }, { status: 400 });
  }

  const existing = await nocodeDb.courseReviews.findUnique({ course_id: courseId, user_id: session.user.id }, token);
  if (existing) {
    await nocodeDb.courseReviews.update(String(existing.id), { rating: String(stars) }, token);
  } else {
    await nocodeDb.courseReviews.create({ course_id: courseId, user_id: session.user.id, rating: String(stars) }, token);
  }

  return NextResponse.json({ ok: true });
}
