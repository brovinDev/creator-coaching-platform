import { auth, getNocodeToken } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";
import { ordersOfCreator } from "@/lib/orders";
import { TaxReports } from "@/components/creator/tax-reports";

export default async function TaxReportsPage() {
  const session = await auth();
  const token = await getNocodeToken();
  const creatorId = session!.user.id;

  const courses = await nocodeDb.courses.findMany({ where: { creator_id: creatorId } }, token);
  const services = await nocodeDb.services.findMany({ where: { creator_id: creatorId } }, token);
  const allOrders = await nocodeDb.orders.findMany({}, token);

  // A report exists for every month in which the creator had a paid or refunded sale.
  const seen = new Set<string>();
  for (const o of ordersOfCreator(
    allOrders,
    new Set(services.map((s) => String(s.id))),
    new Set(courses.map((c) => String(c.id)))
  )) {
    if (o.status !== "paid" && o.status !== "refunded") continue;
    const d = new Date(String(o.created_at || o.createdAt || ""));
    if (!isNaN(d.getTime())) seen.add(`${d.getFullYear()}-${d.getMonth() + 1}`);
  }

  const periods = [...seen]
    .map((k) => {
      const [year, month] = k.split("-").map(Number);
      return { year, month };
    })
    .sort((a, b) => b.year - a.year || b.month - a.month);

  return <TaxReports periods={periods} />;
}
