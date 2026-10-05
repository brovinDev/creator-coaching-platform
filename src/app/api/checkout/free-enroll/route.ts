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
    const { courseId } = await req.json();

    if (!courseId) {
      return NextResponse.json({ error: "Course ID is required" }, { status: 400 });
    }

    const course = await nocodeDb.courses.findUnique({ id: courseId }, token);
    if (!course || Number(course.price) !== 0) {
      return NextResponse.json({ error: "Invalid course" }, { status: 400 });
    }

    const existingEnrollments = await nocodeDb.enrollments.findMany(
      { where: { user_id: session.user.id, course_id: courseId } },
      token
    );
    if (existingEnrollments.length > 0) {
      return NextResponse.json({ error: "Already enrolled" }, { status: 400 });
    }

    await nocodeDb.enrollments.create(
      { user_id: session.user.id, course_id: courseId },
      token
    );

    if (session.user.email) {
      const emailContent = enrollmentEmail(session.user.name || "Student", course.title as string);
      sendEmail({ to: session.user.email, ...emailContent });
    }

    return NextResponse.json({ message: "Enrolled successfully" });
  } catch (error) {
    console.error("Free enroll error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
