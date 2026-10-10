import { NextRequest, NextResponse } from "next/server";
import { nocodeDb } from "@/lib/nocode/db";
import { requireUser } from "@/lib/feed";
import { listRooms } from "@/lib/messages";

/** The rooms this user can open, with unread counts. A creator also gets the services that have no room yet. */
export async function GET() {
  const ctx = await requireUser();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  return NextResponse.json(await listRooms(ctx.user, ctx.token));
}

/** The creator opens a message room for one of their services (one room per service). */
export async function POST(req: NextRequest) {
  const ctx = await requireUser();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const { user, token } = ctx;
  if (user.role !== "CREATOR") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const serviceId = String(body.serviceId || "");
  const service = serviceId ? await nocodeDb.services.findUnique({ id: serviceId }, token).catch(() => null) : null;
  if (!service || String(service.creator_id) !== user.id) {
    return NextResponse.json({ error: "Choose one of your services" }, { status: 400 });
  }
  const existing = await nocodeDb.messageRooms.findUnique({ service_id: serviceId }, token);
  if (existing) return NextResponse.json({ error: "This service already has a room" }, { status: 400 });

  const room = await nocodeDb.messageRooms.create(
    { creator_id: user.id, service_id: serviceId, name: String(service.title || "Room") },
    token
  );
  return NextResponse.json({ id: String(room.id) }, { status: 201 });
}
