import { NextRequest, NextResponse } from "next/server";
import { nocodeDb } from "@/lib/nocode/db";
import { nocodeSignup, nocodeActivateUser, NocodeApiError } from "@/lib/nocode/client";
import { sendEmail, welcomeEmail } from "@/lib/email";

const SYSTEM_TOKEN = process.env.NOCODE_SYSTEM_TOKEN || "";

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json({ error: "Email and OTP are required" }, { status: 400 });
    }

    // Find matching OTP record
    const records = await nocodeDb.emailOtps.findMany(
      { where: { email, otp, verified: false } },
      SYSTEM_TOKEN
    );

    const record = records.find((r) => {
      const expires = r.expires_at ? new Date(r.expires_at as string) : null;
      return expires && expires > new Date();
    });

    if (!record) {
      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 });
    }

    const nameParts = (record.name as string).split(" ");
    const firstName = nameParts[0] || (record.name as string);
    const lastName = nameParts.slice(1).join(" ") || "";

    // Create user in nocode backend
    try {
      await nocodeSignup({
        email: record.email as string,
        password: record.password as string,
        first_name: firstName,
        last_name: lastName,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message.toLowerCase() : "";
      if (!msg.includes("already") && !msg.includes("exists")) {
        throw err;
      }
    }

    // Activate user (skip nocode's email verification since we verified via OTP)
    try {
      await nocodeActivateUser(record.email as string, SYSTEM_TOKEN);
    } catch {
      // May fail if already active
    }

    // Create user profile with role
    // First, we need the user ID — sign in to get it
    const { nocodeSignin } = await import("@/lib/nocode/client");
    let userId = "";
    try {
      const signin = await nocodeSignin(record.email as string, record.password as string);
      userId = signin.data.id;

      await nocodeDb.userProfiles.create(
        {
          user_id: userId,
          role: record.role as string,
        },
        SYSTEM_TOKEN
      );

      if (record.role === "CREATOR") {
        const community = await nocodeDb.communities.create(
          { name: `${record.name}'s Community`, course_id: "" },
          SYSTEM_TOKEN
        );
        const communityId = (community.id as string) || String(community.id);
        await nocodeDb.communityChannels.create(
          { name: "General", position: 0, community_id: communityId },
          SYSTEM_TOKEN
        );
        await nocodeDb.communityChannels.create(
          { name: "Announcements", position: 1, community_id: communityId },
          SYSTEM_TOKEN
        );
      }
    } catch {
      // Profile may already exist if user re-verified
    }

    // Mark OTPs as verified
    if (record.id) {
      await nocodeDb.emailOtps
        .update(String(record.id), { verified: true }, SYSTEM_TOKEN)
        .catch(() => {});
    }

    const emailContent = welcomeEmail(record.name as string);
    sendEmail({ to: email, ...emailContent });

    return NextResponse.json({ message: "Email verified! You can now sign in." });
  } catch (error) {
    console.error("Verify OTP error:", error);
    // The backend refused the sign-up for a reason the person can act on (a weak password, an app
    // that is not open for sign-up). Say so instead of a blank "Verification failed".
    if (error instanceof NocodeApiError && error.status >= 400 && error.status < 500) {
      return NextResponse.json({ error: error.message || "Verification failed" }, { status: 400 });
    }
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
