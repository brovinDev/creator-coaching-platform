import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail, otpEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { name, email } = await req.json();

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await db.emailOtp.deleteMany({ where: { email, verified: false } });

    await db.emailOtp.create({
      data: {
        email,
        otp,
        name,
        password: "",
        role: "STUDENT",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    const emailContent = otpEmail(name, otp);
    await sendEmail({ to: email, ...emailContent });

    return NextResponse.json({ message: "OTP sent to your email" });
  } catch (error) {
    console.error("Checkout send OTP error:", error);
    const message = error instanceof Error ? error.message : "Failed to send OTP";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
