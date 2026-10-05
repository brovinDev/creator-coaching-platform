import { NextRequest, NextResponse } from "next/server";
import { nocodeDb } from "@/lib/nocode/db";
import { auth, getNocodeToken } from "@/lib/auth";
import { sendEmail, enrollmentEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Please sign in to continue" }, { status: 401 });
    }

    const token = await getNocodeToken();
    const { courseId, serviceId } = await req.json();

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
        { user_id: session.user.id, service_id: serviceId },
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
        { user_id: session.user.id, course_id: courseId },
        token
      );
    }

    let enrollmentName = "Course";
    if (serviceId) {
      const service = await nocodeDb.services.findUnique({ id: serviceId }, token);
      if (service) enrollmentName = String(service.title || "Service");
    } else if (courseId) {
      const course = await nocodeDb.courses.findUnique({ id: courseId }, token);
      if (course) enrollmentName = String(course.title || "Course");
    }

    if (session.user.email) {
      const emailContent = enrollmentEmail(session.user.name || "Student", enrollmentName);
      sendEmail({ to: session.user.email, ...emailContent });
    }

    return NextResponse.json({ message: "Enrolled successfully" });
  } catch (error) {
    console.error("Free enroll error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
