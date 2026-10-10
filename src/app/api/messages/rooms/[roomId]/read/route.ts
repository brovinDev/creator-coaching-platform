import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/feed";
import { getAccessibleRoom, markRoomRead } from "@/lib/messages";

/** The user has the room open: everything in it so far counts as read. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  const ctx = await requireUser();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const { user, token } = ctx;
  const { roomId } = await params;

  if (!(await getAccessibleRoom(roomId, user, token))) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  await markRoomRead(roomId, user.id, token);
  return NextResponse.json({ ok: true });
}
