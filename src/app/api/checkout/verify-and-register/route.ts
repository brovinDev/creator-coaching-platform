import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { email, otp, name, password } = await req.json();

    if (!email || !otp || !name || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Account already exists. Please sign in instead." }, { status: 400 });
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

    await db.emailOtp.update({
      where: { id: record.id },
      data: { verified: true },
    });

    const passwordHash = await bcrypt.hash(password, 12);
    await db.user.create({
      data: { name, email, passwordHash, role: "STUDENT", emailVerified: new Date() },
    });

    await db.emailOtp.deleteMany({ where: { email } });

    await sendEmail({
      to: email,
      subject: `Welcome to ${process.env.NEXT_PUBLIC_APP_NAME}!`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1a1a1a;">Welcome, ${name}!</h1>
          <p>Your account has been created successfully.</p>
          <p>You can sign in anytime at:</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/login" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px;">Sign In</a>
        </div>
      `,
    });

    return NextResponse.json({ message: "Account created successfully" });
  } catch (error) {
    console.error("Verify and register error:", error);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}
