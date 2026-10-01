import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { sendEmail, enrollmentEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Please sign in to continue" }, { status: 401 });
    }

    const { courseId } = await req.json();

    if (!courseId) {
      return NextResponse.json({ error: "Course ID is required" }, { status: 400 });
    }

    const course = await db.course.findUnique({ where: { id: courseId } });
    if (!course || !course.published || course.price !== 0) {
      return NextResponse.json({ error: "Invalid course" }, { status: 400 });
    }

    const existing = await db.enrollment.findUnique({
      where: { userId_courseId: { userId: session.user.id, courseId } },
    });
    if (existing) {
      return NextResponse.json({ error: "Already enrolled" }, { status: 400 });
    }

    await db.enrollment.create({
      data: { userId: session.user.id, courseId },
    });

    const user = await db.user.findUnique({ where: { id: session.user.id } });
    if (user) {
      const emailContent = enrollmentEmail(user.name, course.title);
      sendEmail({ to: user.email, ...emailContent });
    }

    return NextResponse.json({ message: "Enrolled successfully" });
  } catch (error) {
    console.error("Free enroll error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
