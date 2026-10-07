import { nocodeDb } from "@/lib/nocode/db";

const SYSTEM_TOKEN = process.env.NOCODE_SYSTEM_TOKEN || "";

/**
 * The nocode auth user owns email and name, but the data API can't join to it, and
 * emails to a creator (who isn't in the request) need an address. Mirror the contact
 * details onto user_profiles whenever we see them (sign-in), filling gaps only.
 *
 * Best-effort: never blocks or fails sign-in.
 */
export async function syncProfileContact(
  profile: Record<string, unknown> | null,
  user: { email?: string | null; first_name?: string | null; last_name?: string | null }
) {
  if (!profile?.id) return;

  const updates: Record<string, unknown> = {};
  if (!profile.email && user.email) updates.email = user.email;
  if (!profile.first_name && user.first_name) updates.first_name = user.first_name;
  if (!profile.last_name && user.last_name) updates.last_name = user.last_name;
  if (Object.keys(updates).length === 0) return;

  try {
    await nocodeDb.userProfiles.update(String(profile.id), updates, SYSTEM_TOKEN);
  } catch (error) {
    console.warn(
      "[profile-contact] Could not sync contact details to user_profiles " +
        "(are email/first_name/last_name added to the module?):",
      error instanceof Error ? error.message : error
    );
  }
}
