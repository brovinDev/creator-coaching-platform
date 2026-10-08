import { NextRequest, NextResponse } from "next/server";
import { auth, getNocodeToken } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";
import { slugify } from "@/lib/utils";
import { DEFAULT_THEME, cleanContent, defaultThanks, emptyContent } from "@/lib/funnel";
import { toFunnel } from "@/lib/funnel-store";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "CREATOR") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = await getNocodeToken();
  const [rows, services] = await Promise.all([
    nocodeDb.funnels.findMany({ where: { creator_id: session.user.id } }, token),
    nocodeDb.services.findMany({ where: { creator_id: session.user.id } }, token),
  ]);
  const titles = new Map(services.map((x) => [String(x.id), String(x.title || "")]));
  return NextResponse.json(
    rows.map(toFunnel).map(({ id, kind, title, slug, published, serviceId }) => ({
      id, kind, title, slug, published, serviceId, serviceTitle: titles.get(serviceId) || "",
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CREATOR") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  // Only the webinar funnel exists so far.
  if (body.kind !== "webinar") return NextResponse.json({ error: "This page type is not available yet" }, { status: 400 });
  const title = String(body.title || "").trim().slice(0, 100) || "My Webinar";

  const token = await getNocodeToken();
  let slug = slugify(title) || "webinar";
  if (await nocodeDb.funnels.findUnique({ slug }, token)) slug = `${slug}-${Date.now().toString(36)}`;

  const row = await nocodeDb.funnels.create(
    {
      creator_id: session.user.id,
      kind: "webinar",
      title,
      slug,
      theme: DEFAULT_THEME,
      content: JSON.stringify(cleanContent(emptyContent())),
      thanks: JSON.stringify(defaultThanks()),
      published: false,
    },
    token
  );
  return NextResponse.json(toFunnel(row));
}
