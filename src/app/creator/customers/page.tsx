import { auth, getNocodeToken } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";
import { Card } from "@/components/ui/card";
import { Users } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export default async function CustomersPage() {
  const session = await auth();
  const token = await getNocodeToken();

  const courses = await nocodeDb.courses.findMany(
    { where: { creator_id: session!.user.id } },
    token
  );
  const courseIds = new Set(courses.map((c) => String(c.id)));
  const courseMap = new Map(courses.map((c) => [String(c.id), c]));

  const allEnrollments = await nocodeDb.enrollments.findMany({}, token);
  const enrollments = allEnrollments.filter((e) => courseIds.has(String(e.course_id)));

  const uniqueStudents = new Map<
    string,
    { name: string; email: string; courses: string[] }
  >();
  for (const e of enrollments) {
    const uid = String(e.user_id);
    const course = courseMap.get(String(e.course_id));
    const existing = uniqueStudents.get(uid);
    if (existing) {
      existing.courses.push(String(course?.title || ""));
    } else {
      uniqueStudents.set(uid, {
        name: String(e.user_name || "Student"),
        email: String(e.user_email || ""),
        courses: [String(course?.title || "")],
      });
    }
  }

  const students = Array.from(uniqueStudents.values());

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Customers</h1>

      {students.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No customers yet"
          description="Customers will appear here when students purchase your courses."
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Email</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Courses</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{student.name}</td>
                    <td className="px-6 py-4 text-gray-500">{student.email}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {student.courses.map((c, j) => (
                          <span key={j} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{c}</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
