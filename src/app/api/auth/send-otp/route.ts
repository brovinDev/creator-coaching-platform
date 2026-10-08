import { NextRequest, NextResponse } from "next/server";
import { nocodeDb } from "@/lib/nocode/db";
import { nocodeSignin, NocodeApiError } from "@/lib/nocode/client";
import { sendEmail, otpEmail } from "@/lib/email";
import { passwordProblem } from "@/lib/password";

const SYSTEM_TOKEN = process.env.NOCODE_SYSTEM_TOKEN || "";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const weak = passwordProblem(password);
    if (weak) {
      return NextResponse.json({ error: weak }, { status: 400 });
    }

    // Check if user already exists by attempting signin
    try {
      await nocodeSignin(email, "___probe___");
      // If no error, user exists (unlikely with wrong password, but handle)
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    } catch (err) {
      if (err instanceof NocodeApiError) {
        // "Invalid credentials" means user exists; "not found" means new user
        const msg = err.message.toLowerCase();
        if (msg.includes("invalid") && !msg.includes("not found") && !msg.includes("not registered")) {
          return NextResponse.json({ error: "Email already registered" }, { status: 400 });
        }
      }
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Delete any existing unverified OTPs for this email
    await nocodeDb.emailOtps.deleteWhere({ email }, SYSTEM_TOKEN).catch(() => {});

    // Store OTP record (password stored as-is; nocode backend will hash on signup)
    await nocodeDb.emailOtps.create(
      {
        email,
        otp,
        name,
        password,
        // Public signup is for creators only; students register from a service's checkout page.
        role: "CREATOR",
        verified: false,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      },
      SYSTEM_TOKEN
    );

    const emailContent = otpEmail(name, otp);
    await sendEmail({ to: email, ...emailContent });

    return NextResponse.json({ message: "OTP sent to your email" });
  } catch (error) {
    console.error("Send OTP error:", error);
    const message = error instanceof Error ? error.message : "Failed to send OTP";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
