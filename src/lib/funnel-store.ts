import { nocodeDb } from "@/lib/nocode/db";
import {
  cleanContent,
  cleanThanks,
  defaultThanks,
  isTheme,
  parseJson,
  DEFAULT_THEME,
  type LandingContent,
  type ThanksContent,
  type ThemeId,
} from "@/lib/funnel";

type Row = Record<string, unknown>;

export interface Funnel {
  id: string;
  kind: string;
  title: string;
  slug: string;
  theme: ThemeId;
  serviceId: string;
  published: boolean;
  content: LandingContent;
  thanks: ThanksContent;
}

export function toFunnel(row: Row): Funnel {
  return {
    id: String(row.id),
    kind: String(row.kind || "webinar"),
    title: String(row.title || ""),
    slug: String(row.slug || ""),
    theme: isTheme(row.theme) ? row.theme : DEFAULT_THEME,
    serviceId: row.service_id ? String(row.service_id) : "",
    published: row.published === true || row.published === "true",
    content: parseJson(row.content, cleanContent),
    thanks: row.thanks ? parseJson(row.thanks, cleanThanks) : defaultThanks(),
  };
}

export async function funnelBySlug(slug: string, token: string): Promise<Funnel | null> {
  const row = await nocodeDb.funnels.findUnique({ slug }, token).catch(() => null);
  return row ? toFunnel(row) : null;
}
