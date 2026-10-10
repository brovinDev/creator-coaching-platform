import { NextRequest, NextResponse } from "next/server";
import { NocodeApiError } from "@/lib/nocode/client";
import { sendEmail } from "@/lib/email";
import { checkOtp, normalizeEmail } from "@/lib/otp-auth";
import { ensureAccount } from "@/lib/account";

/**
 * Checkout: the code is right, so make sure the learner has an account (a returning learner already
 * does). The code is not used up here; the browser signs in with it straight after.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = normalizeEmail(body.email);
    const otp = String(body.otp || "").trim();
    if (!email || !otp) return NextResponse.json({ error: "Email and code are required" }, { status: 400 });

    const checked = await checkOtp(email, otp, { consume: false });
    if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });

    const name = String(checked.record.name || body.name || "");
    const { created } = await ensureAccount({ email, name, role: "STUDENT" });

    if (created) {
      await sendEmail({
        to: email,
        subject: `Welcome to ${process.env.NEXT_PUBLIC_APP_NAME}!`,
        html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1a1a1a;">Welcome, ${name}!</h1>
          <p>Your account has been created successfully.</p>
          <p>You can sign in anytime, with a code we email you, at:</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/login" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px;">Sign In</a>
        </div>
      `,
      }).catch(() => {});
    }

    return NextResponse.json({ message: created ? "Account created successfully" : "Verified" });
  } catch (error) {
    console.error("Verify and register error:", error);
    if (error instanceof NocodeApiError && error.status >= 400 && error.status < 500) {
      return NextResponse.json({ error: error.message || "Failed to create account" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}
