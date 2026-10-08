import { NextRequest, NextResponse } from "next/server";
import { sendLoginOtp } from "@/lib/otp-auth";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const sent = await sendLoginOtp(String(email).trim());
    if (!sent) {
      return NextResponse.json(
        { error: "No account found with this email. Please sign up first." },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Sign-in code sent to your email" });
  } catch (error) {
    console.error("Login OTP send error:", error);
    return NextResponse.json({ error: "Failed to send code" }, { status: 500 });
  }
}
