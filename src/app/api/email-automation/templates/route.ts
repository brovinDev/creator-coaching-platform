import { NextResponse } from "next/server";
import { getNocodeToken } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";
import { requireCreator } from "@/lib/email-automation";

/** Every service of the signed-in creator, with the state of its custom confirmation email. */
export async function GET() {
  const creator = await requireCreator();
  if ("error" in creator) return NextResponse.json({ error: creator.error }, { status: creator.status });

  const token = await getNocodeToken();
  const services = await nocodeDb.services.findMany(
    { where: { creator_id: creator.user.id }, orderBy: { created_at: "DESC" } },
    token
  );
  // A service with no design of its own sends the creator's default, so that is importable too.
  const settings = await nocodeDb.creatorEmailSettings.findUnique({ creator_id: creator.user.id }, token);
  const hasDefault = !!(settings?.default_html && settings?.default_subject);
  if (services.length === 0) return NextResponse.json({ services: [], has_default: hasDefault });

  // No joins in nocode, and the HTML bodies are large, so fetch only the light columns.
  const ids = new Set(services.map((s) => String(s.id)));
  const templates = (
    await nocodeDb.serviceEmailTemplates.findMany(
      { select: ["id", "service_id", "enabled", "subject", "updated_at"] },
      token
    )
  ).filter((t) => ids.has(String(t.service_id)));
  const byService = new Map(templates.map((t) => [String(t.service_id), t]));

  return NextResponse.json({
    has_default: hasDefault,
    services: services.map((s) => {
      const t = byService.get(String(s.id));
      return {
        id: String(s.id),
        title: String(s.title || ""),
        free: !(Number(s.price) > 0),
        has_custom: !!t,
        enabled: !!t?.enabled,
        updated_at: (t?.updated_at as string) || null,
      };
    }),
  });
}
