import { NextRequest, NextResponse } from "next/server";
import { nocodeDb } from "@/lib/nocode/db";

const SYSTEM_TOKEN = process.env.NOCODE_SYSTEM_TOKEN || "";

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json({ error: "Email and OTP are required" }, { status: 400 });
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

    return NextResponse.json({ message: "Email verified", verified: true });
  } catch (error) {
    console.error("Checkout verify email error:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
