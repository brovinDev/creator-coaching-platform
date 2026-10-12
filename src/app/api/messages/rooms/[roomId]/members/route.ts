import { NextRequest, NextResponse } from "next/server";
import { nocodeDb } from "@/lib/nocode/db";
import { requireUser } from "@/lib/feed";
import { getAccessibleRoom } from "@/lib/messages";

/** Who is in a room: its creator and everyone enrolled in the service, the creator first. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  const ctx = await requireUser();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const { user, token } = ctx;
  const { roomId } = await params;

  const room = await getAccessibleRoom(roomId, user, token);
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const creatorId = String(room.creator_id);
  const [enrolled, spoke] = await Promise.all([
    nocodeDb.enrollments.findMany({ where: { service_id: String(room.service_id) } }, token),
    nocodeDb.roomMessages.findMany({ where: { room_id: roomId }, orderBy: { created_at: "desc" }, take: 300 }, token),
  ]);
  const ids = [...new Set([creatorId, ...enrolled.map((e) => String(e.user_id))])].slice(0, 300);

  // A name from their profile, otherwise the one they posted under.
  const postedAs = new Map<string, string>();
  for (const m of spoke) if (!postedAs.has(String(m.user_id))) postedAs.set(String(m.user_id), String(m.user_name || ""));
  const profiles = await Promise.all(ids.map((id) => nocodeDb.userProfiles.findUnique({ user_id: id }, token).catch(() => null)));

  const members = ids.map((id, i) => {
    const p = profiles[i];
    const profileName = [p?.first_name, p?.last_name].filter(Boolean).join(" ").replace(/\s\.$/, "");
    return {
      id,
      name: profileName || postedAs.get(id) || "Member",
      image: typeof p?.avatar === "string" && p.avatar ? p.avatar : null,
      role: id === creatorId ? "CREATOR" : "STUDENT",
      you: id === user.id,
    };
  });
  return NextResponse.json({ members });
}
