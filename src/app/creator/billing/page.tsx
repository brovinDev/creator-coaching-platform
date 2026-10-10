import Link from "next/link";
import { Receipt } from "lucide-react";
import { auth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatPrice } from "@/lib/utils";
import { GST_RATE, planState } from "@/lib/plans";

const day = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default async function BillingPage() {
  const session = await auth();
  const { payments, plan, payment, commission } = await planState(session!.user.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Billing</h1>

      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400">You are on</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {plan.name}
              <span className="ml-2 text-base font-normal text-gray-500">
                {payment
                  ? `${formatPrice(payment.base)} + GST / ${payment.interval === "yearly" ? "year" : "month"}`
                  : "No monthly fee"}
              </span>
            </p>
            <p className="mt-2 text-sm text-gray-600">{plan.tagline}</p>
          </div>
          <Link href="/creator/plans" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
            See all plans
          </Link>
        </div>
        <div className="mt-5 inline-block rounded-lg bg-gray-50 px-4 py-3">
          <p className="text-sm font-semibold text-gray-900">Transaction charges</p>
          <p className="mt-1 text-sm text-gray-600">
            Commission <span className="ml-4 font-medium text-gray-900">{commission}%</span>
          </p>
        </div>
        {payment?.downgradeScheduled && (
          <p className="mt-4 inline-block rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
            You asked to move to Basic. Your {plan.name} plan stays active until {day(payment.expiresAt)}, then you move to Basic.
          </p>
        )}
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Invoices</h2>
        {payments.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No invoices yet"
            description="Invoices for your plan will appear here once you are billed."
          />
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  <th className="px-6 py-3">Invoice No.</th>
                  <th className="px-6 py-3">Billing Date</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Plan</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-t border-gray-100">
                    <td className="px-6 py-4 text-gray-800">{p.invoiceNo}</td>
                    <td className="px-6 py-4 text-gray-700">{day(p.paidAt)}</td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">Paid</span>
                    </td>
                    <td className="px-6 py-4 text-gray-800">
                      {p.planName} <span className="text-gray-400">({p.interval})</span>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900" title={`Includes ${GST_RATE}% GST`}>
                      {formatPrice(p.total)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <a
                        href={`/api/plans/invoices/${p.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-medium text-white hover:bg-gray-700"
                      >
                        Download
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
