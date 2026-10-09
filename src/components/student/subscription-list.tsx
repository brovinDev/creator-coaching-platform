"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BILLING_INTERVALS, isBillingInterval } from "@/lib/billing-intervals";
import { formatPrice } from "@/lib/utils";

interface Sub {
  id: string;
  serviceName: string;
  status: string;
  interval: string;
  amount: number;
  currentEnd: string | null;
  access: boolean;
  cancelled: boolean;
}

const date = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "";

/** The learner's subscriptions, with the next renewal and a way to cancel. */
export function SubscriptionList() {
  const [subs, setSubs] = useState<Sub[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/subscriptions");
    setSubs(res.ok ? await res.json() : []);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function cancel(sub: Sub) {
    const until = date(sub.currentEnd);
    const ok = window.confirm(
      `Cancel ${sub.serviceName}? You will not be charged again${until ? `, and you keep access until ${until}` : ""}.`
    );
    if (!ok) return;
    setBusy(sub.id);
    const res = await fetch(`/api/subscriptions/${sub.id}/cancel`, { method: "POST" });
    setBusy(null);
    if (!res.ok) return toast.error((await res.json().catch(() => null))?.error || "Could not cancel");
    toast.success("Subscription cancelled");
    load();
  }

  if (!subs || subs.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="mb-3 text-lg font-semibold text-gray-900">Subscriptions</h2>
      <div className="space-y-3">
        {subs.map((s) => (
          <Card key={s.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <p className="font-semibold text-gray-900">{s.serviceName}</p>
                <p className="text-sm text-gray-500">
                  {formatPrice(s.amount)} {isBillingInterval(s.interval) ? `/ ${BILLING_INTERVALS[s.interval].per}` : ""}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {s.cancelled
                    ? s.access
                      ? `Cancelled. Access until ${date(s.currentEnd)}.`
                      : "Cancelled. No access."
                    : s.access
                      ? `Renews on ${date(s.currentEnd)}.`
                      : "Payment failed. Access paused until the payment goes through."}
                </p>
              </div>
              {!s.cancelled && (
                <Button variant="outline" size="sm" loading={busy === s.id} onClick={() => cancel(s)}>
                  Cancel subscription
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
