import { nocodeDb } from "@/lib/nocode/db";
import { isValidHexColor } from "@/lib/branding-colors";
import { learnerAccess } from "@/lib/feed";

const SYSTEM_TOKEN = process.env.NOCODE_SYSTEM_TOKEN || "";

export interface Branding {
  brandName: string;
  logoUrl: string;
  emailLogoUrl: string;
  faviconUrl: string;
  themeColor: string;
  previewTitle: string;
  previewDescription: string;
  previewImageUrl: string;
  termsUrl: string;
  privacyUrl: string;
}

const text = (value: unknown) => (typeof value === "string" ? value : "");

/** What the creator saved. Empty strings mean "not set", so callers fall back to their own defaults. */
export function brandingFromRow(row: Record<string, unknown> | null | undefined): Branding {
  const color = text(row?.theme_color);
  return {
    brandName: text(row?.brand_name),
    logoUrl: text(row?.logo_url),
    emailLogoUrl: text(row?.email_logo_url),
    faviconUrl: text(row?.favicon_url),
    themeColor: isValidHexColor(color) ? color : "",
    previewTitle: text(row?.preview_title),
    previewDescription: text(row?.preview_description),
    previewImageUrl: text(row?.preview_image_url),
    termsUrl: text(row?.terms_url),
    privacyUrl: text(row?.privacy_url),
  };
}

/** Never throws: pages must still render when the branding module is missing or empty. */
export async function getBranding(creatorId: string, token = SYSTEM_TOKEN): Promise<Branding> {
  const row = await nocodeDb.creatorBranding.findUnique({ creator_id: creatorId }, token).catch(() => null);
  return brandingFromRow(row);
}

const URL_FIELDS = ["logo_url", "email_logo_url", "favicon_url", "preview_image_url", "terms_url", "privacy_url"] as const;

/** Only http(s) links are kept: these end up in `href`/`src` on public pages and in emails. */
export function isSafeUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/** Validated columns from a request body, or an error message. */
export function brandingFieldsFromBody(body: Record<string, unknown>): Record<string, string> | string {
  const data: Record<string, string> = {};
  const limits: Record<string, number> = {
    brand_name: 100,
    preview_title: 100,
    preview_description: 150,
  };
  for (const [key, max] of Object.entries(limits)) {
    if (typeof body[key] === "string") data[key] = (body[key] as string).trim().slice(0, max);
  }
  if (typeof body.theme_color === "string") {
    const color = body.theme_color.trim();
    if (color && !isValidHexColor(color)) return "Theme colour must look like #4f46e5";
    data.theme_color = color.toLowerCase();
  }
  for (const key of URL_FIELDS) {
    if (typeof body[key] !== "string") continue;
    const value = (body[key] as string).trim();
    if (value && !isSafeUrl(value)) return "Links and image addresses must start with http:// or https://";
    data[key] = value;
  }
  return data;
}

/** A learner sees the branding of the first creator they bought from. */
export async function getLearnerBranding(userId: string, token = SYSTEM_TOKEN): Promise<Branding> {
  const { creatorIds } = await learnerAccess(userId, token).catch(() => ({ creatorIds: new Set<string>() }));
  const first = [...creatorIds][0];
  return first ? getBranding(first, token) : brandingFromRow(null);
}
