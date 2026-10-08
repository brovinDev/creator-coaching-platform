import { nocodeDb } from "@/lib/nocode/db";
import { loadUsableCoupon, serviceTotal } from "@/lib/coupons";

type Row = Record<string, unknown>;

export interface Purchase {
  /** What is charged, in rupees, after coupon and GST. */
  price: number;
  /** Name shown on the Razorpay order. */
  title: string;
  /** Set when a service is being bought. A service never needs a course. */
  serviceId: string | null;
  /** Set only for the older direct course purchase. */
  courseId: string | null;
  couponId: string | null;
}

/**
 * Works out what a learner is paying for, and how much, before an order is created. A service is
 * bought as a service: the price comes from the service and its coupon, and no course is
 * needed (a service may have none, or several). Buying a course directly, without a service,
 * is kept for older links. The amount is never taken from the browser.
 */
export async function resolvePurchase(
  input: { userId: string; serviceId?: string | null; courseId?: string | null; couponId?: string | null },
  token: string
): Promise<Purchase | { error: string; status: number }> {
  const serviceId = input.serviceId ? String(input.serviceId) : "";
  const courseId = input.courseId ? String(input.courseId) : "";

  if (serviceId) {
    const service: Row | null = await nocodeDb.services.findUnique({ id: serviceId }, token).catch(() => null);
    if (!service) return { error: "Service not found", status: 404 };

    let coupon: Row | null = null;
    if (input.couponId) {
      const result = await loadUsableCoupon(String(input.couponId), serviceId);
      if ("error" in result) return { error: result.error, status: 400 };
      coupon = result.coupon;
    }

    const price = serviceTotal(service, coupon);
    if (price <= 0) return { error: "This is free, no payment needed", status: 400 };

    const enrolled = await nocodeDb.enrollments.findMany({ where: { user_id: input.userId, service_id: serviceId } }, token);
    if (enrolled.length > 0) return { error: "Already enrolled in this service", status: 400 };

    return {
      price,
      title: String(service.title || "service"),
      serviceId,
      courseId: null,
      couponId: input.couponId ? String(input.couponId) : null,
    };
  }

  if (!courseId) return { error: "Service is required", status: 400 };

  const course: Row | null = await nocodeDb.courses.findUnique({ id: courseId }, token).catch(() => null);
  if (!course) return { error: "Course not found", status: 404 };

  const price = Number(course.price) || 0;
  if (price <= 0) return { error: "This is free, no payment needed", status: 400 };

  const enrolled = await nocodeDb.enrollments.findMany({ where: { user_id: input.userId, course_id: courseId } }, token);
  if (enrolled.length > 0) return { error: "Already enrolled in this course", status: 400 };

  return { price, title: String(course.title || "course"), serviceId: null, courseId, couponId: null };
}
