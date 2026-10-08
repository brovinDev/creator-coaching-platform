import { nocodeDb } from "@/lib/nocode/db";
import { getBranding } from "@/lib/branding";
import { formatPrice } from "@/lib/utils";
import { funnelBySlug, type Funnel } from "@/lib/funnel-store";
import { eventOfWorkshop } from "@/lib/funnel-event";

const SYSTEM_TOKEN = process.env.NOCODE_SYSTEM_TOKEN || "";

export interface PublicFunnel {
  funnel: Funnel;
  brand: string;
  logo: string;
  registerHref: string;
  price: { now: string; was?: string };
}

/** A funnel visitors may see: published, with its registration service still existing. */
export async function loadPublicFunnel(slug: string): Promise<PublicFunnel | null> {
  const funnel = await funnelBySlug(slug, SYSTEM_TOKEN);
  if (!funnel || !funnel.published || !funnel.serviceId) return null;

  const service = await nocodeDb.services.findUnique({ id: funnel.serviceId }, SYSTEM_TOKEN).catch(() => null);
  if (!service) return null;

  // The date, time and duration always come from the workshop, so editing the workshop updates the page.
  const workshop = funnel.workshopId
    ? await nocodeDb.workshops.findUnique({ id: funnel.workshopId }, SYSTEM_TOKEN).catch(() => null)
    : null;
  if (workshop) funnel.content = { ...funnel.content, ...eventOfWorkshop(workshop) };

  const creatorId = String(service.creator_id);
  const [branding, profile] = await Promise.all([
    getBranding(creatorId),
    nocodeDb.userProfiles.findUnique({ user_id: creatorId }, SYSTEM_TOKEN).catch(() => null),
  ]);
  const name = `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim();

  const price = Number(service.price) || 0;
  const discounted = service.discounted_price ? Number(service.discounted_price) : null;
  const shown = discounted ?? price;
  const free = service.service_type === "free" || shown === 0;
  const was = !free && discounted !== null && price > shown ? formatPrice(price) : undefined;

  return {
    funnel,
    brand: branding.brandName || name || "Creator",
    logo: branding.logoUrl,
    registerHref: `/checkout/${String(service.slug || service.id)}`,
    price: { now: free ? "Free" : formatPrice(shown), ...(was ? { was } : {}) },
  };
}
