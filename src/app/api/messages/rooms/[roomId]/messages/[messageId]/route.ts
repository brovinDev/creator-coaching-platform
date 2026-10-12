import { NextRequest, NextResponse } from "next/server";
import { nocodeDb } from "@/lib/nocode/db";
import { requireUser } from "@/lib/feed";
import { getAccessibleRoom } from "@/lib/messages";

type Ctx = { params: Promise<{ roomId: string; messageId: string }> };

/** Adds the emoji reaction for this user, or takes it away if they had already used it. */
export async function POST(req: NextRequest, { params }: Ctx) {
  const ctx = await requireUser();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const { user, token } = ctx;
  const { roomId, messageId } = await params;

  if (!(await getAccessibleRoom(roomId, user, token))) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  const message = await nocodeDb.roomMessages.findUnique({ id: messageId }, token).catch(() => null);
  if (!message || String(message.room_id) !== roomId) return NextResponse.json({ error: "Message not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const emoji = String(body.emoji || "");
  if (!emoji || emoji.length > 24 || !/^\p{Extended_Pictographic}/u.test(emoji)) {
    return NextResponse.json({ error: "Choose an emoji" }, { status: 400 });
  }

  const existing = await nocodeDb.messageReactions.findFirst({ message_id: messageId, user_id: user.id, emoji }, token);
  if (existing) {
    await nocodeDb.messageReactions.delete(String(existing.id), token);
    return NextResponse.json({ added: false });
  }
  await nocodeDb.messageReactions.create({ message_id: messageId, room_id: roomId, user_id: user.id, emoji }, token);
  return NextResponse.json({ added: true });
}

/** Deletes a message with its replies and reactions: the author may, and so may the room's creator. */
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const ctx = await requireUser();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const { user, token } = ctx;
  const { roomId, messageId } = await params;

  if (!(await getAccessibleRoom(roomId, user, token))) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  const message = await nocodeDb.roomMessages.findUnique({ id: messageId }, token).catch(() => null);
  if (!message || String(message.room_id) !== roomId) return NextResponse.json({ error: "Message not found" }, { status: 404 });
  if (String(message.user_id) !== user.id && user.role !== "CREATOR") {
    return NextResponse.json({ error: "You can only delete your own messages" }, { status: 403 });
  }

  const replies = await nocodeDb.roomMessages.findMany({ where: { room_id: roomId, parent_id: messageId } }, token);
  for (const id of [messageId, ...replies.map((r) => String(r.id))]) {
    await nocodeDb.messageReactions.deleteWhere({ message_id: id }, token);
    await nocodeDb.roomMessages.delete(id, token);
  }
  return NextResponse.json({ deleted: true });
}
