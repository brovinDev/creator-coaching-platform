import { NextRequest, NextResponse } from "next/server";
import { nocodeDb } from "@/lib/nocode/db";
import { nocodeSignup } from "@/lib/nocode/client";
import { sendEmail } from "@/lib/email";

const SYSTEM_TOKEN = process.env.NOCODE_SYSTEM_TOKEN || "";

export async function POST(req: NextRequest) {
  try {
    const { email, otp, name, password } = await req.json();

    if (!email || !otp || !name || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const records = await nocodeDb.emailOtps.findMany(
      { where: { email, otp, verified: false } },
      SYSTEM_TOKEN
    );

    const record = records.find(
      (r) => new Date(r.expires_at as string) > new Date()
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
    const lastName = nameParts.slice(1).join(" ") || "";

    try {
      const signupRes = await nocodeSignup({
        email,
        password,
        first_name: firstName,
        last_name: lastName,
      });

      if ((signupRes as { success: boolean }).success) {
        const userData = (signupRes as { data?: { id?: string } }).data;
        if (userData?.id) {
          await nocodeDb.userProfiles.create(
            { user_id: userData.id, role: "STUDENT" },
            SYSTEM_TOKEN
          );
        }
      }
    } catch (err) {
      const msg = (err as Error).message || "";
      if (!msg.includes("already") && !msg.includes("exists")) {
        throw err;
      }
    }

    await nocodeDb.emailOtps.deleteWhere({ email }, SYSTEM_TOKEN);

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
