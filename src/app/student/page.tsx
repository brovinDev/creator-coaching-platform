import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen } from "lucide-react";

export default async function StudentDashboard() {
  const session = await auth();
  const userId = session!.user.id;

  const enrollments = await db.enrollment.findMany({
    where: { userId },
    include: {
      course: {
        include: {
          creator: { select: { name: true } },
          modules: {
            include: { lessons: { select: { id: true } } },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const progressData = await db.lessonProgress.findMany({
    where: { userId, completed: true },
    select: { lessonId: true },
  });

  const completedLessonIds = new Set(progressData.map((p) => p.lessonId));

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Courses</h1>

      {enrollments.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No courses yet</h3>
          <p className="text-sm text-gray-500">Courses you purchase will appear here.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {enrollments.map(({ course }) => {
            const totalLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
            const completedLessons = course.modules.reduce(
              (sum, m) => sum + m.lessons.filter((l) => completedLessonIds.has(l.id)).length,
              0
            );
            const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

            return (
              <Link key={course.id} href={`/student/courses/${course.id}`}>
                <Card className="cursor-pointer hover:shadow-md hover:border-indigo-200 transition-all h-full">
                  <div className="aspect-video bg-gray-100 rounded-t-xl flex items-center justify-center">
                    {course.thumbnail ? (
                      <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover rounded-t-xl" />
                    ) : (
                      <BookOpen className="h-10 w-10 text-gray-300" />
                    )}
                  </div>
                  <CardContent className="pt-4">
                    <h3 className="font-semibold text-gray-900 line-clamp-1">{course.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">by {course.creator.name}</p>
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>{completedLessons}/{totalLessons} lessons</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
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
