import { nocodeDb } from "@/lib/nocode/db";
import { nocodeSignup, nocodeActivateUser, nocodeUserByEmail, NocodeApiError, type NocodeUser } from "@/lib/nocode/client";
import { randomPassword } from "@/lib/otp-auth";

const SYSTEM_TOKEN = process.env.NOCODE_SYSTEM_TOKEN || "";

/** "Asha" -> first "Asha", last ".": the backend wants both names, and some people give only one. */
export function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return { first: parts[0] || "", last: parts.slice(1).join(" ") || "." };
}

/** The backend refuses first names shorter than 2 characters. */
export const nameProblem = (name: string) =>
  splitName(name).first.length < 2 ? "Please enter your name (at least 2 letters)." : null;

/**
 * Creates the account for an email that proved it owns the address (with the code it was sent), or
 * returns the existing one. The backend needs a password for every account; it gets a random one
 * that nobody sees, because people sign in with a code. Safe to call again for the same email.
 */
export async function ensureAccount(input: {
  email: string;
  name: string;
  role: "CREATOR" | "STUDENT";
}): Promise<{ user: NocodeUser; created: boolean }> {
  let user = await nocodeUserByEmail(input.email, SYSTEM_TOKEN);
  let created = false;

  if (!user) {
    const { first, last } = splitName(input.name);
    try {
      await nocodeSignup({ email: input.email, password: randomPassword(), first_name: first, last_name: last });
      created = true;
    } catch (error) {
      // Lost a race with another request for the same email: carry on with the account that exists.
      const msg = error instanceof Error ? error.message.toLowerCase() : "";
      if (!(error instanceof NocodeApiError) || (!msg.includes("already") && !msg.includes("exists"))) throw error;
    }
  }

  // An unverified account is switched on: the code proved the email.
  if (!user || !user.active) {
    await nocodeActivateUser(input.email, SYSTEM_TOKEN).catch((e) => console.error("[account] activate failed", e));
    user = await nocodeUserByEmail(input.email, SYSTEM_TOKEN);
  }
  if (!user) throw new Error("The account could not be created");

  const profile = await nocodeDb.userProfiles.findUnique({ user_id: user.id }, SYSTEM_TOKEN).catch(() => null);
  if (!profile) {
    await nocodeDb.userProfiles.create({ user_id: user.id, role: input.role }, SYSTEM_TOKEN);
    if (input.role === "CREATOR") {
      // Best effort: the community module asks for a course, which a new creator does not have yet,
      // so this has never succeeded. It must not stop the account from being created.
      try {
        const community = await nocodeDb.communities.create({ name: `${input.name}'s Community`, course_id: "" }, SYSTEM_TOKEN);
        const communityId = String(community.id);
        await nocodeDb.communityChannels.create({ name: "General", position: 0, community_id: communityId }, SYSTEM_TOKEN);
        await nocodeDb.communityChannels.create({ name: "Announcements", position: 1, community_id: communityId }, SYSTEM_TOKEN);
      } catch (error) {
        console.warn("[account] could not create the starter community:", error instanceof Error ? error.message : error);
      }
    }
  }
  return { user, created };
}
