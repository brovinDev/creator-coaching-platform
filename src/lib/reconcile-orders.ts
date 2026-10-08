import { nocodeDb } from "@/lib/nocode/db";
import { getRazorpayPayment, type ProviderPayment } from "@/lib/nocode/client";
import { finalizeOrder } from "@/lib/finalize-order";

const SYSTEM_TOKEN = process.env.NOCODE_SYSTEM_TOKEN || "";

/** An order younger than this is probably still in checkout. */
const MIN_AGE_MS = 2 * 60_000;
/** An order older than this is treated as abandoned and no longer checked. */
const MAX_AGE_MS = 24 * 3600_000;

export interface ReconcileResult {
  checked: number;
  completed: number;
}

/**
 * Finds orders that were paid at Razorpay but never completed here (the learner closed the tab before
 * the confirmation, the connection dropped, or the webhook never arrived) and completes them: marks
 * them paid, enrolls the learner and sends the confirmation. Only orders from the last day are looked
 * at, and each is asked of Razorpay itself, so an unpaid order is never completed.
 */
export async function reconcilePendingOrders(
  now = Date.now(),
  lookup: (razorpayOrderId: string) => Promise<ProviderPayment | null> = (id) => getRazorpayPayment(id, SYSTEM_TOKEN)
): Promise<ReconcileResult> {
  const result: ReconcileResult = { checked: 0, completed: 0 };
  const pending = await nocodeDb.orders.findMany({ where: { status: "pending" } }, SYSTEM_TOKEN);

  for (const order of pending) {
    const age = now - Date.parse(String(order.created_at || ""));
    if (!order.razorpay_order_id || Number.isNaN(age) || age < MIN_AGE_MS || age > MAX_AGE_MS) continue;
    result.checked++;

    const razorpay = await lookup(String(order.razorpay_order_id)).catch(() => null);
    if (!razorpay || razorpay.status !== "succeeded") continue;
    if (Number(razorpay.amount) !== Number(order.amount) * 100) {
      console.error("[reconcile] amount mismatch, left pending", { order: order.id, paid: razorpay.amount, expected: order.amount });
      continue;
    }

    const done = await finalizeOrder(order, {});
    if (done.firstTime) {
      result.completed++;
      await done.sendEmails().catch((e) => console.error("[reconcile] confirmation email failed", e));
    }
  }
  return result;
}
