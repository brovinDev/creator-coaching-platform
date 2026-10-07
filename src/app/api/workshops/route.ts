import { NextRequest, NextResponse } from "next/server";
import { nocodeDb } from "@/lib/nocode/db";
import { learnerAccess, requireUser } from "@/lib/feed";
import { canLearnerAttend, hostNameFor, parseWorkshopBody, rowFromInput, sessionsFor, type Session } from "@/lib/workshops";

type Row = Record<string, unknown>;

/**
 * Sessions the signed-in user can see. A creator gets their own workshops; a learner gets the
 * workshops linked to services they own.
 * ?tab=upcoming|completed (default upcoming), ?from= / ?to= ISO instants, ?limit= (max 200).
 */
export async function GET(req: NextRequest) {
  const ctx = await requireUser();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const { user, token } = ctx;
  const isCreator = user.role === "CREATOR";

  const params = req.nextUrl.searchParams;
  const tab = params.get("tab") === "completed" ? "completed" : "upcoming";
  const from = Date.parse(params.get("from") || "");
  const to = Date.parse(params.get("to") || "");
  const limit = Math.min(Math.max(Number(params.get("limit")) || 100, 1), 200);

  let workshops: Row[] = [];
  let serviceNames: Map<string, string> | undefined;
  if (isCreator) {
    workshops = await nocodeDb.workshops.findMany({ where: { creator_id: user.id } }, token);
    const services = await nocodeDb.services.findMany({ where: { creator_id: user.id } }, token);
    serviceNames = new Map(services.map((s) => [String(s.id), String(s.title)]));
  } else {
    const access = await learnerAccess(user.id, token);
    const lists = await Promise.all(
      [...access.creatorIds].map((id) => nocodeDb.workshops.findMany({ where: { creator_id: id } }, token))
    );
    workshops = lists.flat().filter((w) => canLearnerAttend(w, access.serviceIds));
  }

  const hosts = new Map<string, string>();
  for (const id of new Set(workshops.map((w) => String(w.creator_id)))) {
    hosts.set(id, await hostNameFor(id, token, isCreator ? user.name : "Host"));
  }

  const now = Date.now();
  let sessions: Session[] = workshops.flatMap((w) =>
    sessionsFor(w, hosts.get(String(w.creator_id)) || "Host", { now, isCreator, serviceNames })
  );
  sessions = sessions.filter((s) => (tab === "completed" ? s.status === "completed" : s.status !== "completed"));
  if (!Number.isNaN(from)) sessions = sessions.filter((s) => Date.parse(s.startAt) >= from);
  if (!Number.isNaN(to)) sessions = sessions.filter((s) => Date.parse(s.startAt) <= to);
  sessions.sort((a, b) =>
    tab === "completed" ? Date.parse(b.startAt) - Date.parse(a.startAt) : Date.parse(a.startAt) - Date.parse(b.startAt)
  );

  return NextResponse.json(sessions.slice(0, limit));
}

export async function POST(req: NextRequest) {
  const ctx = await requireUser();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const { user, token } = ctx;
  if (user.role !== "CREATOR") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const services = await nocodeDb.services.findMany({ where: { creator_id: user.id } }, token);
  const input = parseWorkshopBody(await req.json().catch(() => ({})), new Set(services.map((s) => String(s.id))), {
    requireFuture: true,
  });
  if (typeof input === "string") return NextResponse.json({ error: input }, { status: 400 });

  const created = await nocodeDb.workshops.create({ creator_id: user.id, ...rowFromInput(input) }, token);
  return NextResponse.json({ id: created.id }, { status: 201 });
}
