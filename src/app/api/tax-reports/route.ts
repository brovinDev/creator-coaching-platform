import { NextRequest, NextResponse } from "next/server";
import { auth, getNocodeToken } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";
import { ordersOfCreator } from "@/lib/orders";
import { planState } from "@/lib/plans";
import { commissionInvoiceHtml } from "@/lib/invoice-html";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * The commission tax invoice for one month: the plan's commission on the creator's paid sales that
 * month, less what was given back on refunded ones. The plan used is the one in force at month end.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CREATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const year = Number(req.nextUrl.searchParams.get("year"));
  const month = Number(req.nextUrl.searchParams.get("month"));
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: "Invalid month" }, { status: 400 });
  }

  const token = await getNocodeToken();
  const courses = await nocodeDb.courses.findMany({ where: { creator_id: session.user.id } }, token);
  const services = await nocodeDb.services.findMany({ where: { creator_id: session.user.id } }, token);
  const allOrders = await nocodeDb.orders.findMany({}, token);

  const inMonth = ordersOfCreator(
    allOrders,
    new Set(services.map((s) => String(s.id))),
    new Set(courses.map((c) => String(c.id)))
  ).filter((o) => {
    const d = new Date(String(o.created_at || o.createdAt || ""));
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  });
  const sum = (status: string) => inMonth.filter((o) => o.status === status).reduce((t, o) => t + (Number(o.amount) || 0), 0);
  const paid = sum("paid");
  const refunded = sum("refunded");

  const monthEnd = new Date(year, month, 0, 23, 59, 59);
  const { commission: rate, planName } = await planState(session.user.id, monthEnd);

  const html = commissionInvoiceHtml({
    invoiceNo: `TR/${year}/${String(month).padStart(2, "0")}/${session.user.id}`,
    date: monthEnd,
    billTo: { name: session.user.name || "", email: session.user.email || "" },
    month: `${MONTHS[month - 1]} ${year}`,
    rate,
    planName,
    commission: ((paid + refunded) * rate) / 100,
    refunded: (refunded * rate) / 100,
    salesCount: inMonth.filter((o) => o.status === "paid" || o.status === "refunded").length,
    salesTotal: paid + refunded,
  });
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
