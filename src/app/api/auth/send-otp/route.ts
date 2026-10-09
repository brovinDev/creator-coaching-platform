import { NextRequest, NextResponse } from "next/server";
import { nocodeUserByEmail } from "@/lib/nocode/client";
import { isEmail, issueOtp, normalizeEmail } from "@/lib/otp-auth";
import { nameProblem } from "@/lib/account";

const SYSTEM_TOKEN = process.env.NOCODE_SYSTEM_TOKEN || "";

/** Sign-up for a creator: emails a code that proves the address is theirs. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    const email = normalizeEmail(body.email);

    if (!name || !email) return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    if (!isEmail(email)) return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    const badName = nameProblem(name);
    if (badName) return NextResponse.json({ error: badName }, { status: 400 });

    if (await nocodeUserByEmail(email, SYSTEM_TOKEN)) {
      return NextResponse.json({ error: "This email already has an account. Please sign in." }, { status: 400 });
    }

    // Public sign-up is for creators only; students register from a service's checkout page.
    const sent = await issueOtp({ email, name, role: "CREATOR" });
    if (!sent.ok) return NextResponse.json({ error: sent.error }, { status: sent.status });
    return NextResponse.json({ message: "We emailed you a code" });
  } catch (error) {
    console.error("Send OTP error:", error);
    return NextResponse.json({ error: "Could not send the code. Please try again." }, { status: 500 });
  }
}
