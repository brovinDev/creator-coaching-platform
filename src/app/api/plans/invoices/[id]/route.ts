import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { planState } from "@/lib/plans";
import { planInvoiceHtml } from "@/lib/invoice-html";

/** The invoice for one plan payment, as a page that can be printed or saved as PDF. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CREATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const payment = (await planState(session.user.id)).payments.find((p) => p.id === id);
  if (!payment) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  const html = planInvoiceHtml({
    invoiceNo: payment.invoiceNo,
    date: payment.paidAt,
    billTo: { name: session.user.name || "", email: session.user.email || "" },
    planName: payment.planName,
    interval: payment.interval,
    base: payment.base,
    gst: payment.gst,
    total: payment.total,
  });
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
