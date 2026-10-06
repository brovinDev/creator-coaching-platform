import { NextRequest, NextResponse, after } from "next/server";
import { nocodeDb } from "@/lib/nocode/db";
import { auth, getNocodeToken } from "@/lib/auth";
import { sendRegistrationEmails } from "@/lib/registration-emails";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Please sign in to continue" }, { status: 401 });
    }

    const token = await getNocodeToken();
    const { courseId, serviceId, couponId, customFields } = await req.json();

    if (!courseId && !serviceId) {
      return NextResponse.json({ error: "Course ID or Service ID is required" }, { status: 400 });
    }

    if (serviceId) {
      const existing = await nocodeDb.enrollments.findMany(
        { where: { user_id: session.user.id, service_id: serviceId } },
        token
      );
      if (existing.length > 0) {
        return NextResponse.json({ error: "Already enrolled" }, { status: 400 });
      }
      await nocodeDb.enrollments.create(
        { user_id: session.user.id, service_id: serviceId, custom_fields: customFields ? JSON.stringify(customFields) : null },
        token
      );
    } else {
      const course = await nocodeDb.courses.findUnique({ id: courseId }, token);
      if (!course) {
        return NextResponse.json({ error: "Course not found" }, { status: 400 });
      }
      const existing = await nocodeDb.enrollments.findMany(
        { where: { user_id: session.user.id, course_id: courseId } },
        token
      );
      if (existing.length > 0) {
        return NextResponse.json({ error: "Already enrolled" }, { status: 400 });
      }
      await nocodeDb.enrollments.create(
        { user_id: session.user.id, course_id: courseId, custom_fields: customFields ? JSON.stringify(customFields) : null },
        token
      );
    }

    if (couponId) {
      const coupon = await nocodeDb.coupons.findUnique({ id: couponId }, token);
      if (coupon) {
        await nocodeDb.coupons.update(couponId, { usage_count: Number(coupon.usage_count || 0) + 1 }, token);
      }
    }

    after(() =>
      sendRegistrationEmails({
        userId: session.user.id,
        learner: { name: session.user.name, email: session.user.email },
        serviceId,
        courseId,
      })
    );

    return NextResponse.json({ message: "Enrolled successfully" });
  } catch (error) {
    console.error("Free enroll error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
