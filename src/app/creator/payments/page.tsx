import { auth, getNocodeToken } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";
import { Card } from "@/components/ui/card";
import { CreditCard } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { formatPrice } from "@/lib/utils";
import { orderTitle, ordersOfCreator } from "@/lib/orders";

export default async function PaymentsPage() {
  const session = await auth();
  const token = await getNocodeToken();

  const courses = await nocodeDb.courses.findMany(
    { where: { creator_id: session!.user.id } },
    token
  );
  const courseIds = new Set(courses.map((c) => String(c.id)));

  const services = await nocodeDb.services.findMany({ where: { creator_id: session!.user.id } }, token);
  const serviceIds = new Set(services.map((s) => String(s.id)));
  const serviceMap = new Map(services.map((s) => [String(s.id), s as Record<string, unknown>]));

  const allOrders = await nocodeDb.orders.findMany({}, token);
  const orders = ordersOfCreator(allOrders, serviceIds, courseIds)
    .sort(
      (a, b) =>
        new Date(String(b.created_at || b.createdAt || 0)).getTime() -
        new Date(String(a.created_at || a.createdAt || 0)).getTime()
    );

  const courseMap = new Map(courses.map((c) => [String(c.id), c]));

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Payments</h1>

      {orders.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No payments yet"
          description="Payment records will appear here when students purchase your courses."
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Student</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Course</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Amount</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  return (
                    <tr key={String(order.id)} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{String(order.user_name || "Student")}</p>
                          <p className="text-xs text-gray-500">{String(order.user_email || "")}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-700">{orderTitle(order, serviceMap, courseMap)}</td>
                      <td className="px-6 py-4 font-medium">{formatPrice(Number(order.amount))}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          order.status === "paid"
                            ? "bg-green-50 text-green-700"
                            : order.status === "pending"
                            ? "bg-yellow-50 text-yellow-700"
                            : "bg-red-50 text-red-700"
                        }`}>
                          {String(order.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {new Date(String(order.created_at || order.createdAt || "")).toLocaleDateString()}
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
