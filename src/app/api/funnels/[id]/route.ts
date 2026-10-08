import { NextRequest, NextResponse } from "next/server";
import { auth, getNocodeToken } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";
import { cleanContent, cleanThanks, isTheme, missingForPublish } from "@/lib/funnel";
import { toFunnel } from "@/lib/funnel-store";

async function owned(id: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CREATOR") return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const token = await getNocodeToken();
  const row = await nocodeDb.funnels.findUnique({ id }, token).catch(() => null);
  if (!row || String(row.creator_id) !== session.user.id) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  return { token, row, userId: session.user.id };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const o = await owned((await params).id);
  if ("error" in o) return o.error;
  return NextResponse.json(toFunnel(o.row));
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const o = await owned(id);
  if ("error" in o) return o.error;

  const body = await req.json().catch(() => ({}));
  const current = toFunnel(o.row);
  const patch: Record<string, unknown> = {};

  if (body.title !== undefined) patch.title = String(body.title).trim().slice(0, 100) || current.title;
  if (body.theme !== undefined && isTheme(body.theme)) patch.theme = body.theme;
  const content = body.content !== undefined ? cleanContent(body.content) : current.content;
  if (body.content !== undefined) patch.content = JSON.stringify(content);
  if (body.thanks !== undefined) patch.thanks = JSON.stringify(cleanThanks(body.thanks));

  let serviceId = current.serviceId;
  if (body.serviceId !== undefined) {
    serviceId = String(body.serviceId || "");
    if (serviceId) {
      const service = await nocodeDb.services.findUnique({ id: serviceId }, o.token).catch(() => null);
      if (!service || String(service.creator_id) !== o.userId) return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }
    patch.service_id = serviceId || null;
  }

  if (body.published !== undefined) {
    const wantLive = body.published === true;
    if (wantLive) {
      const missing = missingForPublish(content, serviceId);
      if (missing.length) return NextResponse.json({ error: `Before publishing, add ${missing.join(", ")}.` }, { status: 400 });
    }
    patch.published = wantLive;
  }

  const row = await nocodeDb.funnels.update(id, patch, o.token);
  return NextResponse.json(toFunnel({ ...o.row, ...row, ...patch }));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const o = await owned(id);
  if ("error" in o) return o.error;
  await nocodeDb.funnels.delete(id, o.token);
  return NextResponse.json({ ok: true });
}
