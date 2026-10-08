import { NextRequest, NextResponse } from "next/server";
import { nocodeDb } from "@/lib/nocode/db";
import { nocodeSignup, nocodeActivateUser } from "@/lib/nocode/client";
import { sendEmail, welcomeEmail } from "@/lib/email";
import { LOGIN_OTP_ROLE, generateInternalPassword } from "@/lib/otp-auth";

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

    // Sign-in codes (role LOGIN) are consumed by the NextAuth otp provider, not here.
    const record = records.find((r) => {
      if (r.role === LOGIN_OTP_ROLE) return false;
      const expires = r.expires_at ? new Date(r.expires_at as string) : null;
      return expires && expires > new Date();
    });

    if (!record) {
      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 });
    }

    const nameParts = (record.name as string).split(" ");
    const firstName = nameParts[0] || (record.name as string);
    // The nocode backend rejects an empty last name, so single-word names get a placeholder.
    const lastName = nameParts.slice(1).join(" ") || "-";

    // Sign-in is by emailed code; the backend still needs a password, so use a random one.
    const internalPassword = generateInternalPassword();

    // Create user in nocode backend
    try {
      await nocodeSignup({
        email: record.email as string,
        password: internalPassword,
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
      const signin = await nocodeSignin(record.email as string, internalPassword);
      userId = signin.data.id;

      await nocodeDb.userProfiles.create(
        {
          user_id: userId,
          role: record.role as string,
          // Lets the code-based sign-in find this account by email.
          email: record.email as string,
          first_name: firstName,
          last_name: lastName,
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
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
