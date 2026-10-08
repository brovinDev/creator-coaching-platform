import { NextRequest, NextResponse } from "next/server";
import { nocodeForgotPassword } from "@/lib/nocode/client";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    try {
      await nocodeForgotPassword(email);
    } catch {
      // Don't reveal whether email exists
    }

    return NextResponse.json({ message: "If the email exists, a reset link has been sent." });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
