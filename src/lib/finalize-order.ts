import { nocodeDb } from "@/lib/nocode/db";
import { redeemCoupon } from "@/lib/coupons";
import { sendRegistrationEmails } from "@/lib/registration-emails";

const SYSTEM_TOKEN = process.env.NOCODE_SYSTEM_TOKEN || "";

type Row = Record<string, unknown>;

export interface FinalizedOrder {
  /** False when the order had already been completed (a second confirmation of the same payment). */
  firstTime: boolean;
  courseSlug: string;
  serviceName: string;
  amount: number;
  transactionId: string;
  /** Sends the learner's confirmation and the creator's notification. The caller decides when. */
  sendEmails: () => Promise<unknown>;
}

/**
 * Completes a paid order: marks it paid, enrolls the learner and counts the coupon. Safe to call
 * twice for the same order (a learner returning to the site while the background check also finds
 * the payment), and it never enrolls someone twice.
 */
export async function finalizeOrder(
  order: Row,
  opts: { paymentId?: string | null; signature?: string | null; learner?: { name?: string | null; email?: string | null } }
): Promise<FinalizedOrder> {
  const serviceId = order.service_id ? String(order.service_id) : null;
  const courseId = order.course_id ? String(order.course_id) : null;

  const [course, service, fresh] = await Promise.all([
    courseId ? nocodeDb.courses.findUnique({ id: courseId }, SYSTEM_TOKEN) : null,
    serviceId ? nocodeDb.services.findUnique({ id: serviceId }, SYSTEM_TOKEN) : null,
    nocodeDb.orders.findUnique({ id: String(order.id) }, SYSTEM_TOKEN),
  ]);

  const transactionId = String(opts.paymentId || order.razorpay_payment_id || order.razorpay_order_id || "");
  const result = {
    courseSlug: String(course?.slug || ""),
    serviceName: String(service?.title || course?.title || "Course"),
    amount: Number(order.amount) || 0,
    transactionId,
  };
  const noEmails = async () => undefined;

  if (fresh?.status === "paid") return { ...result, firstTime: false, sendEmails: noEmails };

  await nocodeDb.orders.update(
    String(order.id),
    { status: "paid", razorpay_payment_id: opts.paymentId || null, razorpay_signature: opts.signature || null },
    SYSTEM_TOKEN
  );

  const existing = serviceId
    ? await nocodeDb.enrollments.findMany({ where: { user_id: String(order.user_id), service_id: serviceId } }, SYSTEM_TOKEN)
    : await nocodeDb.enrollments.findMany({ where: { user_id: String(order.user_id), course_id: courseId } }, SYSTEM_TOKEN);
  if (existing.length === 0) {
    // The creator's checkout form answers travel from the order onto the enrollment.
    const answers = order.custom_fields ? { custom_fields: String(order.custom_fields) } : {};
    await nocodeDb.enrollments.create(
      serviceId
        ? { user_id: String(order.user_id), service_id: serviceId, ...answers }
        : { user_id: String(order.user_id), course_id: courseId, ...answers },
      SYSTEM_TOKEN
    );
  }

  if (order.coupon_id) await redeemCoupon(String(order.coupon_id));

  return {
    ...result,
    firstTime: true,
    sendEmails: () =>
      sendRegistrationEmails({
        userId: String(order.user_id),
        learner: opts.learner,
        serviceId,
        courseId,
        amount: result.amount,
        transactionId,
      }),
  };
}
