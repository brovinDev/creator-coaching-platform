import { NextRequest, NextResponse } from "next/server";
import { NocodeApiError } from "@/lib/nocode/client";
import { sendEmail, welcomeEmail } from "@/lib/email";
import { checkOtp, normalizeEmail } from "@/lib/otp-auth";
import { ensureAccount } from "@/lib/account";

/**
 * Finishes a creator's sign-up: the code is right, so the account is created. The code is not used
 * up here; the browser signs in with it straight after, which is what uses it up.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = normalizeEmail(body.email);
    const otp = String(body.otp || "").trim();
    if (!email || !otp) return NextResponse.json({ error: "Email and code are required" }, { status: 400 });

    const checked = await checkOtp(email, otp, { consume: false });
    if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });

    const name = String(checked.record.name || "");
    const { created } = await ensureAccount({ email, name, role: "CREATOR" });
    if (created) sendEmail({ to: email, ...welcomeEmail(name) });

    return NextResponse.json({ message: "Email verified" });
  } catch (error) {
    console.error("Verify OTP error:", error);
    // The backend refused the sign-up for a reason the person can act on (for instance an app that
    // is not open for sign-up). Say so instead of a blank "Verification failed".
    if (error instanceof NocodeApiError && error.status >= 400 && error.status < 500) {
      return NextResponse.json({ error: error.message || "Verification failed" }, { status: 400 });
    }
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
