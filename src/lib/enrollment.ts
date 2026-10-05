import { nocodeDb } from "@/lib/nocode/db";

export async function hasEnrollmentAccess(
  userId: string,
  courseId: string,
  token: string
): Promise<boolean> {
  const direct = await nocodeDb.enrollments.findUnique(
    { user_id: userId, course_id: courseId },
    token
  );
  if (direct) return true;

  const enrollments = await nocodeDb.enrollments.findMany(
    { where: { user_id: userId } },
    token
  );
  const serviceIds = enrollments
    .filter((e) => e.service_id)
    .map((e) => String(e.service_id));

  if (serviceIds.length === 0) return false;

  const services = await Promise.all(
    serviceIds.map((sid) => nocodeDb.services.findUnique({ id: sid }, token))
  );

  for (const svc of services) {
    if (!svc) continue;
    const courseIds = String(svc.course_id || "")
      .split(",")
      .filter(Boolean)
      .map((s) => s.trim());
    if (courseIds.includes(courseId)) return true;
  }

  return false;
}
