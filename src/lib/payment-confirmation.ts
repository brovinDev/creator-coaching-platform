import { getPaymentByOrderId, getRazorpayPayment, type ProviderPayment } from "@/lib/nocode/client";

export type Confirmation =
  | { state: "succeeded"; amount: number }
  | { state: "failed" }
  | { state: "mismatch"; reason: string }
  | { state: "pending" };

interface Options {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  /** What the order should have cost, in paise. */
  expectedPaise: number;
  attempts?: number;
  intervalMs?: number;
  /** Replaceable for tests. */
  lookup?: (paymentId: string) => Promise<ProviderPayment | null>;
  recorded?: (orderId: string) => Promise<{ status: string; amount: number } | null>;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Decides whether a payment really happened. The payment id comes from the browser, so it is never
 * trusted by itself: Razorpay is asked (through the backend, with the keys connected there) and the
 * payment must belong to this order, be captured, and match the order's amount.
 *
 * This does not depend on Razorpay's webhook reaching the backend, which cannot happen on localhost
 * and can be late anywhere. The webhook's record is still used as a second source.
 */
export async function confirmPayment(opts: Options): Promise<Confirmation> {
  const attempts = opts.attempts ?? 6;
  const intervalMs = opts.intervalMs ?? 1500;
  const lookup = opts.lookup ?? ((id: string) => getRazorpayPayment(id, process.env.NOCODE_SYSTEM_TOKEN || ""));
  const recorded = opts.recorded ?? getPaymentByOrderId;

  const judge = (status: string, amount: number, currency?: string): Confirmation | null => {
    if (status === "failed") return { state: "failed" };
    if (status !== "succeeded") return null; // still being processed
    if (Number(amount) !== opts.expectedPaise || (currency && currency.toUpperCase() !== "INR")) {
      return { state: "mismatch", reason: "Payment amount does not match the order" };
    }
    return { state: "succeeded", amount: Number(amount) };
  };

  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt > 0) await wait(intervalMs);

    if (opts.razorpayPaymentId.startsWith("pay_")) {
      const payment = await lookup(opts.razorpayPaymentId).catch(() => null);
      if (payment) {
        if (payment.orderId && payment.orderId !== opts.razorpayOrderId) {
          return { state: "mismatch", reason: "This payment belongs to a different order" };
        }
        const verdict = judge(payment.status, payment.amount, payment.currency);
        if (verdict) return verdict;
      }
    }

    // Second source: the payment Razorpay's webhook recorded for this order.
    const record = await recorded(opts.razorpayOrderId).catch(() => null);
    if (record) {
      const verdict = judge(record.status, record.amount);
      if (verdict) return verdict;
    }
  }
  return { state: "pending" };
}
