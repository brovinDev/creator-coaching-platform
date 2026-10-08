import { NextRequest, NextResponse } from "next/server";
import { nocodeDb } from "@/lib/nocode/db";
import { nocodeSignup, nocodeActivateUser, nocodeSignin } from "@/lib/nocode/client";
import { sendEmail } from "@/lib/email";
import { LOGIN_OTP_ROLE, generateInternalPassword, storeLoginOtp } from "@/lib/otp-auth";

const SYSTEM_TOKEN = process.env.NOCODE_SYSTEM_TOKEN || "";

export async function POST(req: NextRequest) {
  try {
    const { email, otp, name } = await req.json();

    if (!email || !otp || !name) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const records = await nocodeDb.emailOtps.findMany(
      { where: { email, otp } },
      SYSTEM_TOKEN
    );

    const record = records.find(
      (r) =>
        r.role !== LOGIN_OTP_ROLE && !r.verified && new Date(r.expires_at as string) > new Date()
    );

    if (!record) {
      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 });
    }

    await nocodeDb.emailOtps.update(
      String(record.id),
      { verified: true },
      SYSTEM_TOKEN
    );

    const nameParts = name.trim().split(/\s+/);
    const firstName = nameParts[0] || name;
    const lastName = nameParts.slice(1).join(" ") || ".";

    // Sign-in is by emailed code; the backend still needs a password, so use a random one.
    const internalPassword = generateInternalPassword();

    try {
      await nocodeSignup({
        email,
        password: internalPassword,
        first_name: firstName,
        last_name: lastName,
      });
    } catch (err) {
      const msg = (err as Error).message || "";
      if (!msg.includes("already") && !msg.includes("exists")) {
        console.error("Signup error:", msg);
        return NextResponse.json({ error: msg || "Signup failed" }, { status: 400 });
      }
    }

    await nocodeActivateUser(email, SYSTEM_TOKEN).catch((e) => {
      console.error("Activate user error:", e);
    });

    try {
      const signinRes = await nocodeSignin(email, internalPassword);
      if (signinRes.success && signinRes.data?.id) {
        const existing = await nocodeDb.userProfiles
          .findUnique({ user_id: signinRes.data.id }, SYSTEM_TOKEN)
          .catch(() => null);
        if (!existing) {
          await nocodeDb.userProfiles.create(
            {
              user_id: signinRes.data.id,
              role: "STUDENT",
              // Lets the code-based sign-in find this account by email.
              email,
              first_name: firstName,
              last_name: lastName,
            },
            SYSTEM_TOKEN
          );
        }
      }
    } catch {
      // Profile creation is non-critical
    }

    // The code is used up by registering. Re-issue it as a sign-in code so the checkout page
    // can sign the new user in with the same code they just entered.
    await storeLoginOtp(email, otp);

    await sendEmail({
      to: email,
      subject: `Welcome to ${process.env.NEXT_PUBLIC_APP_NAME}!`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1a1a1a;">Welcome, ${name}!</h1>
          <p>Your account has been created successfully.</p>
          <p>You can sign in anytime at:</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/login" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 6px;">Sign In</a>
        </div>
      `,
    });

    return NextResponse.json({ message: "Account created successfully" });
  } catch (error) {
    console.error("Verify and register error:", error);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}
