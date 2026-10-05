import { NextRequest, NextResponse } from "next/server";
import { nocodeSignup } from "@/lib/nocode/client";
import { nocodeDb } from "@/lib/nocode/db";
import { sendEmail, welcomeEmail } from "@/lib/email";

const SYSTEM_TOKEN = process.env.NOCODE_SYSTEM_TOKEN || "";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, role } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const nameParts = name.split(" ");
    const firstName = nameParts[0] || name;
    const lastName = nameParts.slice(1).join(" ") || "";

    // Create user in nocode backend
    try {
      await nocodeSignup({ email, password, first_name: firstName, last_name: lastName });
    } catch (err) {
      const msg = err instanceof Error ? err.message.toLowerCase() : "";
      if (msg.includes("already") || msg.includes("exists")) {
        return NextResponse.json({ error: "Email already registered" }, { status: 400 });
      }
      throw err;
    }

    // Sign in to get user ID for creating profile
    const { nocodeSignin } = await import("@/lib/nocode/client");
    try {
      const signin = await nocodeSignin(email, password);
      const userId = signin.data.id;
      const userRole = role === "CREATOR" ? "CREATOR" : "STUDENT";

      await nocodeDb.userProfiles.create(
        { user_id: userId, role: userRole },
        SYSTEM_TOKEN
      );

      if (userRole === "CREATOR") {
        const community = await nocodeDb.communities.create(
          { name: `${name}'s Community`, course_id: "" },
          SYSTEM_TOKEN
        );
        const communityId = String(community.id);
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
      // Profile creation can fail if user needs email verification first
    }

    const emailContent = welcomeEmail(name);
    sendEmail({ to: email, ...emailContent });

    return NextResponse.json({ message: "Account created successfully" });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
