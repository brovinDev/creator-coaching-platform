import { NextRequest, NextResponse } from "next/server";
import { nocodeDb } from "@/lib/nocode/db";
import { requireUser } from "@/lib/feed";
import { MAX_MESSAGE_LENGTH, getAccessibleRoom, groupReactions, messageOut } from "@/lib/messages";

/** The latest messages in a room and their replies, oldest first, each with its reactions. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  const ctx = await requireUser();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const { user, token } = ctx;
  const { roomId } = await params;

  if (!(await getAccessibleRoom(roomId, user, token))) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const [rows, reactionRows] = await Promise.all([
    nocodeDb.roomMessages.findMany({ where: { room_id: roomId }, orderBy: { created_at: "desc" }, take: 300 }, token),
    nocodeDb.messageReactions.findMany({ where: { room_id: roomId } }, token),
  ]);
  const reactions = groupReactions(reactionRows, user.id);
  return NextResponse.json(
    rows.reverse().map((m) => messageOut(m, user.id, [...(reactions.get(String(m.id))?.values() ?? [])]))
  );
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  const ctx = await requireUser();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const { user, token } = ctx;
  const { roomId } = await params;

  if (!(await getAccessibleRoom(roomId, user, token))) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!content) return NextResponse.json({ error: "Write a message" }, { status: 400 });
  if (content.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: `Messages can be up to ${MAX_MESSAGE_LENGTH} characters` }, { status: 400 });
  }

  // A reply answers a message of this room, and never another reply (one level of threads).
  let parentId = "";
  if (body.parentId) {
    const parent = await nocodeDb.roomMessages.findUnique({ id: String(body.parentId) }, token).catch(() => null);
    if (!parent || String(parent.room_id) !== roomId || parent.parent_id) {
      return NextResponse.json({ error: "That message can no longer be replied to" }, { status: 400 });
    }
    parentId = String(parent.id);
  }

  const message = await nocodeDb.roomMessages.create(
    { room_id: roomId, user_id: user.id, user_name: user.name || "Member", user_role: user.role, content, parent_id: parentId },
    token
  );
  return NextResponse.json(
    messageOut({ ...message, user_id: user.id, user_name: user.name, user_role: user.role, content, parent_id: parentId }, user.id),
    { status: 201 }
  );
}
