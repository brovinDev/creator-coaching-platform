import { NextRequest, NextResponse } from "next/server";
import { nocodeDb } from "@/lib/nocode/db";
import { requireUser } from "@/lib/feed";
import { MAX_MESSAGE_LENGTH, getAccessibleRoom, messageOut } from "@/lib/messages";

/** The latest messages in a room, oldest first. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  const ctx = await requireUser();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const { user, token } = ctx;
  const { roomId } = await params;

  if (!(await getAccessibleRoom(roomId, user, token))) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const rows = await nocodeDb.roomMessages.findMany({ where: { room_id: roomId }, orderBy: { created_at: "desc" }, take: 200 }, token);
  return NextResponse.json(rows.reverse().map((m) => messageOut(m, user.id)));
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

  const message = await nocodeDb.roomMessages.create(
    { room_id: roomId, user_id: user.id, user_name: user.name || "Member", user_role: user.role, content },
    token
  );
  return NextResponse.json(messageOut({ ...message, user_id: user.id, user_name: user.name, user_role: user.role, content }, user.id), { status: 201 });
}
