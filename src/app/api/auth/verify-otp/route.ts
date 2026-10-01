import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail, welcomeEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json({ error: "Email and OTP are required" }, { status: 400 });
    }

    const record = await db.emailOtp.findFirst({
      where: {
        email,
        otp,
        verified: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!record) {
      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    const user = await db.user.create({
      data: {
        name: record.name,
        email: record.email,
        passwordHash: record.password,
        role: record.role,
        emailVerified: new Date(),
      },
    });

    if (user.role === "CREATOR") {
      await db.community.create({
        data: {
          name: `${user.name}'s Community`,
          creatorId: user.id,
          channels: {
            create: [
              { name: "General", position: 0 },
              { name: "Announcements", position: 1 },
            ],
          },
        },
      });
    }

    await db.emailOtp.updateMany({
      where: { email },
      data: { verified: true },
    });

    const emailContent = welcomeEmail(user.name);
    sendEmail({ to: email, ...emailContent });

    return NextResponse.json({ message: "Email verified! You can now sign in." });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
