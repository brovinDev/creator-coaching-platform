import { NextRequest, NextResponse } from "next/server";
import { nocodeResetPassword } from "@/lib/nocode/client";

export async function POST(req: NextRequest) {
  try {
    const { token, password, email } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ error: "Token and password are required" }, { status: 400 });
    }

    try {
      await nocodeResetPassword(email || "", password, token);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Invalid or expired reset token";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    return NextResponse.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
