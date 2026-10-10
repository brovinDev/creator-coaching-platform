import { NextRequest, NextResponse } from "next/server";
import { nocodeUserByEmail } from "@/lib/nocode/client";
import { isEmail, issueOtp, normalizeEmail } from "@/lib/otp-auth";

const SYSTEM_TOKEN = process.env.NOCODE_SYSTEM_TOKEN || "";

/** Emails a sign-in code to someone who already has an account. */
export async function POST(req: NextRequest) {
  try {
    const email = normalizeEmail((await req.json()).email);
    if (!isEmail(email)) return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });

    const user = await nocodeUserByEmail(email, SYSTEM_TOKEN);
    if (!user) {
      return NextResponse.json({ error: "No account found with this email. Please sign up first." }, { status: 404 });
    }

    const sent = await issueOtp({ email, name: user.firstName, role: "STUDENT" });
    if (!sent.ok) return NextResponse.json({ error: sent.error }, { status: sent.status });
    return NextResponse.json({ message: "We emailed you a sign-in code" });
  } catch (error) {
    console.error("Login OTP error:", error);
    return NextResponse.json({ error: "Could not send the code. Please try again." }, { status: 500 });
  }
}
