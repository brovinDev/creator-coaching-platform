import { nocodeDb } from "@/lib/nocode/db";

const text = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));

/** Name and picture for each user id, looked up once. */
export async function authorsFor(userIds: string[], token: string) {
  const authors = new Map<string, { name: string; avatar: string | null }>();
  await Promise.all(
    [...new Set(userIds)].map(async (uid) => {
      const profile = await nocodeDb.userProfiles.findUnique({ user_id: uid }, token).catch(() => null);
      const name = profile ? `${text(profile.first_name)} ${text(profile.last_name)}`.trim() : "";
      authors.set(uid, { name: name || text(profile?.email) || "Student", avatar: text(profile?.avatar) || null });
    })
  );
  return authors;
}
