import { NextRequest, NextResponse } from "next/server";
import { nocodeDb } from "@/lib/nocode/db";
import { requireUser } from "@/lib/feed";
import { idList } from "@/lib/feed";
import { parseWorkshopBody, rowFromInput, scheduleOf } from "@/lib/workshops";

async function ownedWorkshop(workshopId: string) {
  const ctx = await requireUser();
  if ("error" in ctx) return { error: ctx.error, status: ctx.status } as const;
  const { user, token } = ctx;
  const workshop = await nocodeDb.workshops.findUnique({ id: workshopId }, token).catch(() => null);
  if (user.role !== "CREATOR" || !workshop || workshop.creator_id !== user.id) {
    return { error: "Workshop not found", status: 404 } as const;
  }
  return { user, token, workshop } as const;
}

/** The workshop as the create form edits it. */
export async function GET(_req: Request, { params }: { params: Promise<{ workshopId: string }> }) {
  const found = await ownedWorkshop((await params).workshopId);
  if ("error" in found) return NextResponse.json({ error: found.error }, { status: found.status });
  const w = found.workshop;
  const s = scheduleOf(w);
  return NextResponse.json({
    id: String(w.id),
    title: w.title || "",
    description: w.description || "",
    thumbnailUrl: w.thumbnail_url || "",
    meetingUrl: w.meeting_url || "",
    timezone: s.timezone,
    startDate: s.start_date,
    startTime: s.start_time,
    durationMinutes: s.duration_minutes,
    recurring: s.recurring,
    recurrenceDays: s.recurrence_days,
    recurrenceEnd: s.recurrence_end,
    serviceIds: idList(w.service_ids),
    excludeServiceIds: idList(w.exclude_service_ids),
    upsellServiceId: String(w.upsell_service_id || ""),
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ workshopId: string }> }) {
  const found = await ownedWorkshop((await params).workshopId);
  if ("error" in found) return NextResponse.json({ error: found.error }, { status: found.status });
  const { user, token, workshop } = found;

  const services = await nocodeDb.services.findMany({ where: { creator_id: user.id } }, token);
  // Editing keeps working on a workshop whose first session has already happened.
  const input = parseWorkshopBody(await req.json().catch(() => ({})), new Set(services.map((s) => String(s.id))), {
    requireFuture: false,
  });
  if (typeof input === "string") return NextResponse.json({ error: input }, { status: 400 });

  await nocodeDb.workshops.update(String(workshop.id), rowFromInput(input), token);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ workshopId: string }> }) {
  const found = await ownedWorkshop((await params).workshopId);
  if ("error" in found) return NextResponse.json({ error: found.error }, { status: found.status });
  await nocodeDb.workshops.delete(String(found.workshop.id), found.token);
  return NextResponse.json({ ok: true });
}
