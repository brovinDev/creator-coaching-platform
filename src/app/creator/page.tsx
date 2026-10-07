import { auth, getNocodeToken } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Users, CreditCard, FileText } from "lucide-react";

export default async function CreatorDashboard() {
  const session = await auth();
  const userId = session!.user.id;
  const token = await getNocodeToken();

  const [courses, enrollments, orders, landingPages] = await Promise.all([
    nocodeDb.courses.findMany({ where: { creator_id: userId } }, token),
    nocodeDb.enrollments.findMany({}, token),
    nocodeDb.orders.findMany({ where: { status: "paid" } }, token),
    nocodeDb.landingPages.findMany({}, token),
  ]);

  const courseIds = new Set(courses.map((c) => String(c.id)));
  const myEnrollments = enrollments.filter((e) => courseIds.has(String(e.course_id)));
  const myOrders = orders.filter((o) => courseIds.has(String(o.course_id)));
  const myLandingPages = landingPages.filter((lp) => courseIds.has(String(lp.course_id)));
  const totalRevenue = myOrders.reduce((sum, o) => sum + Number(o.amount || 0), 0);

  const stats = [
    { label: "Courses", value: courses.length, icon: BookOpen, color: "bg-blue-50 text-blue-600" },
    { label: "Students", value: myEnrollments.length, icon: Users, color: "bg-green-50 text-green-600" },
    { label: "Revenue", value: `₹${totalRevenue}`, icon: CreditCard, color: "bg-purple-50 text-purple-600" },
    { label: "Landing Pages", value: myLandingPages.length, icon: FileText, color: "bg-orange-50 text-orange-600" },
  ];

  const recentOrders = myOrders.slice(0, 5);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <Card key={stat.label} className="hover:shadow-md transition-shadow">
            <CardContent className="flex items-center gap-4 py-5">
              <div className={`p-3 rounded-xl ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <div className="px-6 py-4">
          <h2 className="text-lg font-semibold">Recent Sales</h2>
        </div>
        <CardContent className="p-0">
          {recentOrders.length === 0 ? (
            <p className="text-sm text-gray-500 p-6">No sales yet. Create a course and start selling!</p>
          ) : (
            <div>
              {recentOrders.map((order) => (
                <div key={String(order.id)} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{String(order.user_name || "Student")}</p>
                    <p className="text-xs text-gray-500">{String(order.course_title || "")}</p>
                  </div>
                  <p className="text-sm font-semibold text-green-600">₹{Number(order.amount)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
