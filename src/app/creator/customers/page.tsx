import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export default async function CustomersPage() {
  const session = await auth();

  const enrollments = await db.enrollment.findMany({
    where: { course: { creatorId: session!.user.id } },
    include: {
      user: { select: { id: true, name: true, email: true, createdAt: true } },
      course: { select: { title: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const uniqueStudents = new Map<string, { name: string; email: string; courses: string[]; enrolledAt: Date }>();
  for (const e of enrollments) {
    const existing = uniqueStudents.get(e.user.id);
    if (existing) {
      existing.courses.push(e.course.title);
    } else {
      uniqueStudents.set(e.user.id, {
        name: e.user.name,
        email: e.user.email,
        courses: [e.course.title],
        enrolledAt: e.createdAt,
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
