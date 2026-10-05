import { NextRequest, NextResponse } from "next/server";
import { nocodeDb } from "@/lib/nocode/db";
import { sendEmail, otpEmail } from "@/lib/email";

const SYSTEM_TOKEN = process.env.NOCODE_SYSTEM_TOKEN || "";

export async function POST(req: NextRequest) {
  try {
    const { name, email } = await req.json();

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await nocodeDb.emailOtps.deleteWhere({ email, verified: false }, SYSTEM_TOKEN);

    await nocodeDb.emailOtps.create(
      {
        email,
        otp,
        name,
        password: "",
        role: "STUDENT",
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      },
      SYSTEM_TOKEN
    );

    const emailContent = otpEmail(name, otp);
    await sendEmail({ to: email, ...emailContent });

    return NextResponse.json({ message: "OTP sent to your email" });
  } catch (error) {
    console.error("Checkout send OTP error:", error);
    const message = error instanceof Error ? error.message : "Failed to send OTP";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
