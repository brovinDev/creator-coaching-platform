import { nocodeDb } from "@/lib/nocode/db";
import {
  createRazorpayPlan,
  getRazorpaySubscription,
  type ProviderSubscription,
} from "@/lib/nocode/client";
import { sendRegistrationEmails } from "@/lib/registration-emails";

const SYSTEM_TOKEN = process.env.NOCODE_SYSTEM_TOKEN || "";

type Row = Record<string, unknown>;

import { BILLING_INTERVALS, isBillingInterval, type BillingInterval } from "@/lib/billing-intervals";

export { BILLING_INTERVALS, isBillingInterval };
export type { BillingInterval };

export const isSubscriptionService = (service: Row) => service.service_type === "subscription";

/**
 * The Razorpay plan for a service at its current price. Plans cannot be edited at Razorpay, so one
 * is created the first time someone buys and again whenever the price or interval has changed.
 */
export async function ensurePlan(service: Row, amountPaise: number, interval: BillingInterval): Promise<string> {
  const key = `${amountPaise}:${interval}`;
  if (service.razorpay_plan_id && service.plan_key === key) return String(service.razorpay_plan_id);

  const planId = await createRazorpayPlan(
    { name: String(service.title || "Subscription"), amountPaise, interval, notes: { service_id: String(service.id) } },
    SYSTEM_TOKEN
  );
  await nocodeDb.services.update(String(service.id), { razorpay_plan_id: planId, plan_key: key }, SYSTEM_TOKEN);
  return planId;
}

/** Whether a learner should have access, from what Razorpay reports. */
export function hasAccess(state: Pick<ProviderSubscription, "status" | "paidCount" | "currentEnd">, now = Date.now()) {
  if (state.paidCount < 1) return false; // nothing paid yet
  if (["active", "authenticated", "pending"].includes(state.status)) return true; // pending = Razorpay is retrying a failed charge
  // Cancelled, finished or stopped: what was paid for still runs to the end of the period.
  return state.currentEnd !== null && state.currentEnd * 1000 > now;
}

export interface SyncResult {
  row: Row;
  access: boolean;
  /** True the first time this subscription became paid, so the confirmation goes out once. */
  firstPayment: boolean;
  latestPaymentId: string;
  amount: number;
}

/**
 * Brings one subscription up to date with Razorpay: records each charge as an order, keeps the paid-until
 * date, and gives or takes away access. Safe to run any number of times.
 */
export async function syncSubscription(row: Row, now = Date.now()): Promise<SyncResult> {
  const subId = String(row.razorpay_subscription_id);
  const state = await getRazorpaySubscription(subId, SYSTEM_TOKEN);
  const userId = String(row.user_id);
  const serviceId = String(row.service_id);

  // One paid order per charge, so payments and revenue include renewals.
  const known = new Set(
    (await nocodeDb.orders.findMany({ where: { subscription_id: subId } }, SYSTEM_TOKEN)).map((o) => String(o.razorpay_payment_id))
  );
  for (const p of state.payments) {
    if (known.has(p.paymentId)) continue;
    await nocodeDb.orders.create(
      {
        user_id: userId,
        service_id: serviceId,
        course_id: null,
        amount: p.amountPaise / 100,
        currency: "INR",
        status: "paid",
        razorpay_payment_id: p.paymentId,
        subscription_id: subId,
      },
      SYSTEM_TOKEN
    );
  }

  const access = hasAccess(state, now);
  const wasPaid = Number(row.paid_count) >= 1;
  const firstPayment = access && !wasPaid;

  const enrollments = await nocodeDb.enrollments.findMany({ where: { user_id: userId, service_id: serviceId } }, SYSTEM_TOKEN);
  if (access && enrollments.length === 0) {
    await nocodeDb.enrollments.create({ user_id: userId, service_id: serviceId }, SYSTEM_TOKEN);
  } else if (!access && enrollments.length > 0) {
    for (const e of enrollments) await nocodeDb.enrollments.delete(String(e.id), SYSTEM_TOKEN);
  }

  const cancelled = ["cancelled", "completed", "expired", "halted"].includes(state.status);
  const patch: Row = {
    status: state.status,
    paid_count: String(state.paidCount),
    current_end: state.currentEnd ? new Date(state.currentEnd * 1000).toISOString() : row.current_end || null,
    access: access ? "on" : "off",
    ...(cancelled && !row.cancelled_at ? { cancelled_at: new Date(now).toISOString() } : {}),
  };
  const updated = await nocodeDb.serviceSubscriptions.update(String(row.id), patch, SYSTEM_TOKEN);

  const latest = state.payments.sort((a, b) => (b.paidAt ?? 0) - (a.paidAt ?? 0))[0];
  return {
    row: { ...row, ...updated, ...patch },
    access,
    firstPayment,
    latestPaymentId: latest?.paymentId || "",
    amount: latest ? latest.amountPaise / 100 : Number(row.amount) || 0,
  };
}

/** The confirmation emails for a learner's first payment. Renewals do not send one yet. */
export function sendFirstPaymentEmails(row: Row, result: SyncResult, learner?: { name?: string | null; email?: string | null }) {
  return sendRegistrationEmails({
    userId: String(row.user_id),
    learner,
    serviceId: String(row.service_id),
    courseId: null,
    amount: result.amount,
    transactionId: result.latestPaymentId,
  });
}

/** How long a never-paid subscription is still worth checking (the learner may still be paying). */
const CREATED_MAX_AGE_MS = 24 * 3600_000;
const CREATED_MIN_AGE_MS = 2 * 60_000;

/**
 * Every few minutes: finds renewals, failed charges, cancellations and period ends at Razorpay, and
 * learners who paid but closed the tab before the confirmation. Does not depend on webhooks.
 */
export async function reconcileSubscriptions(now = Date.now()): Promise<{ checked: number; changed: number }> {
  const rows = await nocodeDb.serviceSubscriptions.findMany({}, SYSTEM_TOKEN);
  let checked = 0;
  let changed = 0;

  for (const row of rows) {
    const age = now - Date.parse(String(row.created_at || ""));
    const live = row.access === "on";
    const maybePaying = ["created", "authenticated"].includes(String(row.status)) && age >= CREATED_MIN_AGE_MS && age <= CREATED_MAX_AGE_MS;
    if (!live && !maybePaying) continue;
    checked++;

    try {
      const before = `${row.status}|${row.paid_count}|${row.access}`;
      const result = await syncSubscription(row, now);
      if (`${result.row.status}|${result.row.paid_count}|${result.row.access}` !== before) changed++;
      if (result.firstPayment) await sendFirstPaymentEmails(row, result).catch((e) => console.error("[subscriptions] email failed", e));
    } catch (e) {
      console.error("[subscriptions] could not sync", row.id, e);
    }
  }
  return { checked, changed };
}
