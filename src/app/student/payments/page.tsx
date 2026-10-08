import { auth, getNocodeToken } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";
import { Card, CardContent } from "@/components/ui/card";
import { CreditCard, CheckCircle, Clock, XCircle, IndianRupee } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { orderTitle } from "@/lib/orders";

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  paid: { label: "Paid", color: "text-green-700 bg-green-50", icon: CheckCircle },
  pending: { label: "Pending", color: "text-yellow-700 bg-yellow-50", icon: Clock },
  failed: { label: "Failed", color: "text-red-700 bg-red-50", icon: XCircle },
};

export default async function StudentPaymentsPage() {
  const session = await auth();
  const userId = session!.user.id;
  const token = await getNocodeToken();

  const orders = await nocodeDb.orders.findMany({ where: { user_id: userId } }, token);
  orders.sort(
    (a, b) =>
      new Date(String(b.created_at || b.createdAt || 0)).getTime() -
      new Date(String(a.created_at || a.createdAt || 0)).getTime()
  );

  // An order is for a service, or (older direct course purchases) for a course.
  const courseMap = new Map<string, Record<string, unknown>>();
  for (const cid of new Set(orders.filter((o) => !o.service_id && o.course_id).map((o) => String(o.course_id)))) {
    const course = await nocodeDb.courses.findUnique({ id: cid }, token);
    if (course) courseMap.set(cid, course);
  }
  const serviceMap = new Map<string, Record<string, unknown>>();
  for (const sid of new Set(orders.filter((o) => o.service_id).map((o) => String(o.service_id)))) {
    const service = await nocodeDb.services.findUnique({ id: sid }, token).catch(() => null);
    if (service) serviceMap.set(sid, service);
  }

  const totalSpent = orders
    .filter((o) => o.status === "paid")
    .reduce((sum, o) => sum + Number(o.amount || 0), 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Payment History</h1>

      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <IndianRupee className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Spent</p>
                <p className="text-xl font-bold text-gray-900">{formatPrice(totalSpent)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Successful</p>
                <p className="text-xl font-bold text-gray-900">
                  {orders.filter((o) => o.status === "paid").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-50 rounded-lg">
                <CreditCard className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Orders</p>
                <p className="text-xl font-bold text-gray-900">{orders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12">
          <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No payments yet</h3>
          <p className="text-sm text-gray-500">Your purchase history will appear here.</p>
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left bg-gray-50/50">
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Course</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Payment ID</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const config = statusConfig[String(order.status)] || statusConfig.pending;
                  const StatusIcon = config.icon;
                  return (
                    <tr key={String(order.id)} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{orderTitle(order, serviceMap, courseMap)}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-semibold text-gray-900">{formatPrice(Number(order.amount))}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {config.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {new Date(String(order.created_at || order.createdAt || "")).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-xs text-gray-400 font-mono">
                          {String(order.razorpay_payment_id || "—")}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
