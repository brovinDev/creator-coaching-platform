import { NextRequest, NextResponse } from "next/server";
import { nocodeDb } from "@/lib/nocode/db";
import { requireUser } from "@/lib/feed";
import { getAccessibleRoom } from "@/lib/messages";

/** Mutes or unmutes a room for the signed-in person: a muted room does not count towards their unread badge. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  const ctx = await requireUser();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const { user, token } = ctx;
  const { roomId } = await params;

  if (!(await getAccessibleRoom(roomId, user, token))) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  const muted = (await req.json().catch(() => ({}))).muted === true;

  const existing = await nocodeDb.roomReads.findFirst({ room_id: roomId, user_id: user.id }, token);
  if (existing) await nocodeDb.roomReads.update(String(existing.id), { muted: muted ? "true" : "false" }, token);
  // No row yet means nothing read: an empty read position counts the same as having no row.
  else await nocodeDb.roomReads.create({ room_id: roomId, user_id: user.id, last_read_at: "", muted: muted ? "true" : "false" }, token);
  return NextResponse.json({ muted });
}
