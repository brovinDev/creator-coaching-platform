"use client";

import { useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import toast from "react-hot-toast";
import { Card } from "@/components/ui/card";
import { cn, formatPrice } from "@/lib/utils";

type Interval = "monthly" | "yearly";

interface PlanCard {
  id: string;
  name: string;
  commission: number;
  tagline: string;
  features: string[];
  /** Prices before GST, already worked out on the server. */
  prices: { monthly: number; yearly: number };
}

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Open Slate";

export function PlansView({
  plans,
  currentPlanId,
  currentInterval,
  currentEndsOn,
  downgradeScheduled,
}: {
  plans: PlanCard[];
  currentPlanId: string;
  currentInterval: Interval | null;
  /** When the paid plan ends, as text; null on Basic. */
  currentEndsOn: string | null;
  downgradeScheduled: boolean;
}) {
  const router = useRouter();
  const [interval, setInterval] = useState<Interval>(currentInterval ?? "monthly");
  const [busy, setBusy] = useState<string | null>(null);
  const currentIndex = plans.findIndex((p) => p.id === currentPlanId);

  async function choose(plan: PlanCard, index: number) {
    const downgrade = index < currentIndex;
    if (plan.prices.monthly === 0) {
      if (!window.confirm(`You stay on ${plans[currentIndex].name} until ${currentEndsOn}, then move to Basic. Continue?`)) return;
      const res = await fetch("/api/plans/downgrade", { method: "POST" });
      if (res.ok) {
        toast.success(`You will move to Basic on ${currentEndsOn}`);
        router.refresh();
      } else {
        toast.error("Could not schedule the downgrade");
      }
      return;
    }
    if (
      downgrade &&
      !window.confirm(
        `Switching to ${plan.name} starts a new period today and pays for it now. The time left on ${plans[currentIndex].name} is not refunded. Continue?`
      )
    )
      return;
    await pay(plan);
  }

  async function pay(plan: PlanCard) {
    setBusy(plan.id);
    try {
      const res = await fetch("/api/plans/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id, interval }),
      });
      const order = await res.json();
      if (!res.ok) {
        toast.error(order.error || "Could not start the payment");
        setBusy(null);
        return;
      }

      new window.Razorpay({
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        name: APP_NAME,
        description: order.description,
        order_id: order.razorpayOrderId,
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string }) => {
          const verify = await fetch("/api/plans/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
            }),
          });
          if (verify.ok) {
            toast.success(`You are now on ${plan.name}`);
            router.push("/creator/billing");
            router.refresh();
          } else {
            const data = await verify.json().catch(() => ({}));
            toast.error(data.error || "Payment could not be confirmed");
            setBusy(null);
          }
        },
        modal: { ondismiss: () => setBusy(null) },
      }).open();
    } catch {
      toast.error("Could not start the payment");
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plans</h1>
          <p className="mt-1 text-sm text-gray-500">Choose the plan that fits your business. Prices exclude GST.</p>
        </div>
        <div className="inline-flex rounded-full bg-gray-100 p-1 text-sm">
          {(["monthly", "yearly"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setInterval(v)}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-full px-4 py-1.5 font-medium capitalize",
                interval === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
              )}
            >
              {v}
              {v === "yearly" && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  2 months free
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan, i) => {
          const free = plan.prices.monthly === 0;
          const isCurrent = plan.id === currentPlanId && (free || interval === currentInterval);
          const onThisPlan = plan.id === currentPlanId;
          const scheduled = free && downgradeScheduled;
          const label = isCurrent
            ? "Your current plan"
            : scheduled
            ? "Downgrade scheduled"
            : free
            ? "Downgrade to Basic"
            : onThisPlan
            ? `Switch to ${interval}`
            : i > currentIndex
            ? "Upgrade"
            : "Downgrade";

          return (
            <Card key={plan.id} className={cn("flex flex-col p-5", onThisPlan && "ring-2 ring-indigo-500")}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">{plan.name}</h2>
                {onThisPlan && (
                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                    Current
                  </span>
                )}
              </div>
              <p className="mt-3 text-3xl font-bold text-gray-900">
                {free ? "Free" : formatPrice(plan.prices[interval])}
                {!free && (
                  <span className="text-sm font-normal text-gray-500">
                    {" "}
                    +GST /{interval === "yearly" ? "year" : "month"}
                  </span>
                )}
              </p>
              <p className="mt-1 text-sm font-medium text-gray-700">
                {plan.commission === 0 ? "Zero commission" : `${plan.commission}% commission`}
              </p>
              <p className="mt-2 text-sm text-gray-500">{plan.tagline}</p>

              <button
                type="button"
                disabled={isCurrent || scheduled || busy !== null}
                onClick={() => choose(plan, i)}
                className={cn(
                  "mt-4 w-full rounded-lg border py-2 text-sm font-medium transition-colors",
                  isCurrent || scheduled
                    ? "border-gray-200 bg-gray-50 text-gray-400"
                    : "cursor-pointer border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
                )}
              >
                {busy === plan.id ? "Opening payment..." : label}
              </button>

              <p className="mt-4 text-xs font-medium uppercase tracking-wider text-gray-400">
                {i === 0 ? "Includes" : `Everything in ${plans[i - 1].name}, plus`}
              </p>
              <ul className="mt-2 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2 text-sm text-gray-700">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                    {f}
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
