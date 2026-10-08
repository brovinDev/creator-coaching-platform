import { NextRequest, NextResponse } from "next/server";
import { nocodeUserByEmail } from "@/lib/nocode/client";
import { isEmail, issueOtp, normalizeEmail } from "@/lib/otp-auth";
import { nameProblem } from "@/lib/account";

const SYSTEM_TOKEN = process.env.NOCODE_SYSTEM_TOKEN || "";

/** Checkout: emails a code to a new or returning learner. A returning learner does not need to give a name. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = normalizeEmail(body.email);
    let name = String(body.name || "").trim();
    if (!isEmail(email)) return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });

    const existing = await nocodeUserByEmail(email, SYSTEM_TOKEN);
    if (existing) {
      name = existing.firstName;
    } else {
      if (!name) return NextResponse.json({ error: "Please enter your name to create your account.", needsName: true }, { status: 400 });
      const badName = nameProblem(name);
      if (badName) return NextResponse.json({ error: badName }, { status: 400 });
    }

    const sent = await issueOtp({ email, name, role: "STUDENT" });
    if (!sent.ok) return NextResponse.json({ error: sent.error }, { status: sent.status });
    return NextResponse.json({ message: "We emailed you a code", existingAccount: Boolean(existing) });
  } catch (error) {
    console.error("Checkout send OTP error:", error);
    return NextResponse.json({ error: "Could not send the code. Please try again." }, { status: 500 });
  }
}
