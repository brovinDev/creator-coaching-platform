import { auth, getNocodeToken } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen } from "lucide-react";

export default async function StudentDashboard() {
  const session = await auth();
  const userId = session!.user.id;
  const token = await getNocodeToken();

  const enrollments = await nocodeDb.enrollments.findMany({ where: { user_id: userId } }, token);

  const courseIds = enrollments.map((e) => String(e.course_id));
  const courses = [];
  for (const courseId of courseIds) {
    const course = await nocodeDb.courses.findUnique({ id: courseId }, token);
    if (course) courses.push(course);
  }

  const allModules: Array<Record<string, unknown> & { lessons: Record<string, unknown>[]; courseId: string }> = [];
  for (const course of courses) {
    const mods = await nocodeDb.courseModules.findMany(
      { where: { course_id: String(course.id) }, orderBy: { position: "asc" } },
      token
    );
    for (const mod of mods) {
      const lessons = await nocodeDb.lessons.findMany(
        { where: { module_id: String(mod.id) }, orderBy: { position: "asc" } },
        token
      );
      allModules.push({ ...mod, lessons, courseId: String(course.id) });
    }
  }

  const progress = await nocodeDb.lessonProgress.findMany(
    { where: { user_id: userId, completed: true } },
    token
  );
  const completedLessonIds = new Set(progress.map((p) => String(p.lesson_id)));

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Courses</h1>

      {courses.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No courses yet</h3>
          <p className="text-sm text-gray-500">Courses you purchase will appear here.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => {
            const courseModules = allModules.filter((m) => m.courseId === String(course.id));
            const totalLessons = courseModules.reduce(
              (sum, m) => sum + (m.lessons as unknown[]).length,
              0
            );
            const completedLessons = courseModules.reduce(
              (sum, m) =>
                sum +
                (m.lessons as Array<Record<string, unknown>>).filter((l) =>
                  completedLessonIds.has(String(l.id))
                ).length,
              0
            );
            const progressPct =
              totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

            return (
              <Link key={String(course.id)} href={`/student/courses/${course.id}`}>
                <Card className="cursor-pointer hover:shadow-md hover:border-indigo-200 transition-all h-full">
                  <div className="aspect-video bg-gray-100 rounded-t-xl flex items-center justify-center">
                    {course.thumbnail ? (
                      <img
                        src={String(course.thumbnail)}
                        alt={String(course.title)}
                        className="w-full h-full object-cover rounded-t-xl"
                      />
                    ) : (
                      <BookOpen className="h-10 w-10 text-gray-300" />
                    )}
                  </div>
                  <CardContent className="pt-4">
                    <h3 className="font-semibold text-gray-900 line-clamp-1">
                      {String(course.title)}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      by {String(course.creator_name || "Creator")}
                    </p>
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>
                          {completedLessons}/{totalLessons} lessons
                        </span>
                        <span>{progressPct}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 rounded-full transition-all"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
