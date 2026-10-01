import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { sendEmail, otpEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, role } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const passwordHash = await bcrypt.hash(password, 12);

    await db.emailOtp.deleteMany({ where: { email } });

    await db.emailOtp.create({
      data: {
        email,
        otp,
        name,
        password: passwordHash,
        role: role === "CREATOR" ? "CREATOR" : "STUDENT",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    const emailContent = otpEmail(name, otp);
    await sendEmail({ to: email, ...emailContent });

    return NextResponse.json({ message: "OTP sent to your email" });
  } catch (error) {
    console.error("Send OTP error:", error);
    const message = error instanceof Error ? error.message : "Failed to send OTP";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
