import { NextRequest, NextResponse } from "next/server";
import { auth, getNocodeToken } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";

type Row = Record<string, unknown>;

const text = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));

/** A phone number out of the checkout form answers, if the learner gave one. */
function phoneFrom(enrollment: Row): string {
  const raw = enrollment.custom_fields;
  if (typeof raw !== "string" || !raw) return "";
  try {
    const answers = JSON.parse(raw) as Record<string, unknown>;
    for (const [key, value] of Object.entries(answers)) {
      const v = text(value).trim();
      if (/phone|mobile|whatsapp|contact/i.test(key) && /^[+\d][\d\s()-]{6,}$/.test(v)) return v;
    }
    for (const value of Object.values(answers)) {
      const v = text(value).trim();
      if (/^\+?\d[\d\s()-]{8,}$/.test(v)) return v;
    }
  } catch {
    // Not JSON: no phone to show.
  }
  return "";
}

/**
 * Progress for one course: who is in it, how far each person is, and how many finished each chapter.
 * A learner is in the course when they are enrolled in it directly or in a service that includes it.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "CREATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await getNocodeToken();
  const course = await nocodeDb.courses.findUnique({ id: courseId, creator_id: session.user.id }, token);
  if (!course) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Chapters in course order.
  const modules = await nocodeDb.courseModules.findMany(
    { where: { course_id: courseId }, orderBy: { position: "asc" } },
    token
  );
  const chapters: { id: string; title: string; section: string; sectionIndex: number; index: number }[] = [];
  for (let s = 0; s < modules.length; s++) {
    const lessons = await nocodeDb.lessons.findMany(
      { where: { module_id: String(modules[s].id) }, orderBy: { position: "asc" } },
      token
    );
    lessons.forEach((l, i) =>
      chapters.push({
        id: String(l.id),
        title: text(l.title),
        section: text(modules[s].title),
        sectionIndex: s + 1,
        index: i + 1,
      })
    );
  }

  // Everyone enrolled: directly, or through one of this creator's services that includes the course.
  const services = await nocodeDb.services.findMany({ where: { creator_id: session.user.id } }, token);
  const serviceIds = services
    .filter((s) => text(s.course_id).split(",").map((x) => x.trim()).includes(courseId))
    .map((s) => String(s.id));

  const enrollments: Row[] = [...(await nocodeDb.enrollments.findMany({ where: { course_id: courseId } }, token))];
  for (const sid of serviceIds) {
    enrollments.push(...(await nocodeDb.enrollments.findMany({ where: { service_id: sid } }, token)));
  }

  // One entry per person, keeping their earliest enrolment as the purchase date.
  const people = new Map<string, { purchasedOn: string; phone: string; name: string; email: string }>();
  for (const e of enrollments) {
    const uid = text(e.user_id);
    if (!uid) continue;
    const when = text(e.created_at);
    const seen = people.get(uid);
    if (!seen || (when && (!seen.purchasedOn || when < seen.purchasedOn))) {
      people.set(uid, {
        purchasedOn: when,
        phone: phoneFrom(e) || seen?.phone || "",
        name: seen?.name || text(e.user_name),
        email: seen?.email || text(e.user_email),
      });
    } else if (!seen.phone) {
      seen.phone = phoneFrom(e);
    }
  }

  // Names and emails from the profiles.
  await Promise.all(
    [...people.entries()].map(async ([uid, p]) => {
      const profile = await nocodeDb.userProfiles.findUnique({ user_id: uid }, token).catch(() => null);
      if (!profile) return;
      const full = `${text(profile.first_name)} ${text(profile.last_name)}`.trim();
      if (full) p.name = full;
      if (!p.email) p.email = text(profile.email);
    })
  );

  // Completed chapters per person, with first and last activity.
  const completedBy = new Map<string, { chapters: Set<string>; first: string; last: string }>();
  const finishers = new Map<string, string[]>();
  await Promise.all(
    chapters.map(async (c) => {
      const rows = await nocodeDb.lessonProgress.findMany({ where: { lesson_id: c.id } }, token);
      const done: string[] = [];
      for (const r of rows) {
        const uid = text(r.user_id);
        if (!people.has(uid)) continue;
        const completed = r.completed === true || r.completed === "true";
        const created = text(r.created_at);
        const updated = text(r.updated_at) || created;
        const entry = completedBy.get(uid) ?? { chapters: new Set<string>(), first: "", last: "" };
        if (created && (!entry.first || created < entry.first)) entry.first = created;
        if (updated && (!entry.last || updated > entry.last)) entry.last = updated;
        if (completed) {
          entry.chapters.add(c.id);
          done.push(uid);
        }
        completedBy.set(uid, entry);
      }
      finishers.set(c.id, done);
    })
  );

  const total = chapters.length;
  const learners = [...people.entries()].map(([uid, p]) => {
    const progress = completedBy.get(uid);
    const done = progress?.chapters.size ?? 0;
    return {
      userId: uid,
      name: p.name || p.email || "Student",
      email: p.email,
      phone: p.phone,
      completedChapters: done,
      completion: total ? Math.round((done / total) * 100) : 0,
      purchasedOn: p.purchasedOn || null,
      firstProgressOn: progress?.first || null,
      lastProgressOn: progress?.last || null,
    };
  });

  return NextResponse.json({
    totalChapters: total,
    learners,
    chapters: chapters.map((c) => ({
      ...c,
      users: (finishers.get(c.id) ?? []).map((uid) => {
        const p = people.get(uid);
        return { userId: uid, name: p?.name || p?.email || "Student", email: p?.email || "" };
      }),
    })),
  });
}
