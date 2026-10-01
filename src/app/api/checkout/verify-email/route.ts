import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

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

    await db.emailOtp.update({
      where: { id: record.id },
      data: { verified: true },
    });

    return NextResponse.json({ message: "Email verified", verified: true });
  } catch (error) {
    console.error("Checkout verify email error:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
