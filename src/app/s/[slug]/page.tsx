import { nocodeDb } from "@/lib/nocode/db";
import { notFound } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";
import type { Metadata } from "next";
import { getBranding } from "@/lib/branding";
import { buttonStyle } from "@/lib/branding-colors";

const SYSTEM_TOKEN = process.env.NOCODE_SYSTEM_TOKEN || "";
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Open Slate";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = await nocodeDb.services.findUnique({ slug }, SYSTEM_TOKEN).catch(() => null);
  if (!service) return {};

  const branding = await getBranding(String(service.creator_id));
  const title = branding.previewTitle || String(service.title || "") || branding.brandName;
  const description = branding.previewDescription || String(service.description || "").slice(0, 150);
  const image = branding.previewImageUrl || String(service.cover_image || "");
  return {
    title,
    description,
    openGraph: { title, description, ...(image ? { images: [image] } : {}) },
    ...(branding.faviconUrl ? { icons: { icon: branding.faviconUrl } } : {}),
  };
}

export default async function ServicePreviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const service = await nocodeDb.services.findUnique({ slug }, SYSTEM_TOKEN);
  if (!service) notFound();

  const creatorProfile = await nocodeDb.userProfiles
    .findUnique({ user_id: String(service.creator_id) }, SYSTEM_TOKEN)
    .catch(() => null);

  const branding = await getBranding(String(service.creator_id));
  const firstName = String(creatorProfile?.first_name || "");
  const lastName = String(creatorProfile?.last_name || "");
  const creatorName = branding.brandName || `${firstName} ${lastName}`.trim() || "Creator";

  const logoUrl = branding.logoUrl || (creatorProfile?.avatar as string) || null;
  const logoInitials = creatorName
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const price = Number(service.price) || 0;
  const discountedPrice = service.discounted_price ? Number(service.discounted_price) : null;
  const displayPrice = discountedPrice ?? price;
  const isFree = service.service_type === "free" || price === 0;

  const courseIdsStr = (service.course_id as string) || "";
  const courseIds = courseIdsStr ? courseIdsStr.split(",").filter(Boolean) : [];

  let firstCourseThumbnail: string | null = null;
  let firstCourseSlug: string | null = null;
  if (courseIds.length > 0) {
    const firstCourse = await nocodeDb.courses
      .findUnique({ id: courseIds[0].trim() }, SYSTEM_TOKEN)
      .catch(() => null);
    if (firstCourse?.thumbnail) {
      firstCourseThumbnail = firstCourse.thumbnail as string;
    }
    if (firstCourse?.slug) {
      firstCourseSlug = firstCourse.slug as string;
    }
  }

  const serviceTitle = String(service.title || "");
  const serviceDescription = String(service.description || "");
  const coverImage = String(service.cover_image || "") || firstCourseThumbnail;
  const serviceSlug = String(service.slug || slug);
  const checkoutUrl = `/checkout/${serviceSlug}`;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-8">
        <div className="flex justify-center mb-6">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={creatorName}
              className="w-16 h-16 rounded-lg object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-gray-900 flex items-center justify-center text-xl font-bold text-white">
              {logoInitials}
            </div>
          )}
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
          {serviceTitle}
        </h1>

        <p className="text-sm text-gray-500 mt-2">
          {"by "}
          <span className="font-medium text-gray-700">{creatorName}</span>
        </p>

        {coverImage && (
          <div className="mt-6 rounded-lg overflow-hidden">
            <img
              src={coverImage}
              alt={serviceTitle}
              className="w-full object-cover"
            />
          </div>
        )}

        {serviceDescription && (
          <div className="mt-6 text-gray-700 text-base leading-relaxed whitespace-pre-line">
            {serviceDescription}
          </div>
        )}
      </div>

      {/* Sticky bottom bar */}
      <div className="sticky bottom-0 border-t border-gray-200 bg-white">
        <div className="max-w-lg mx-auto w-full px-4 py-3 flex items-center justify-between">
          <div>
            {isFree ? (
              <span className="text-lg font-bold text-gray-900">Free</span>
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-gray-900">
                  {formatPrice(displayPrice)}
                </span>
                {discountedPrice !== null && (
                  <span className="text-sm text-gray-400 line-through">
                    {formatPrice(price)}
                  </span>
                )}
              </div>
            )}
          </div>
          <Link
            href={checkoutUrl}
            style={buttonStyle(branding.themeColor)}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            {isFree ? "Register" : "Buy Now"}
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 py-4 px-4">
        <div className="max-w-lg mx-auto w-full flex items-center justify-between text-xs text-gray-400">
          <span>{APP_NAME} {new Date().getFullYear()}.</span>
          <div className="flex gap-4">
            {branding.privacyUrl ? (
              <a href={branding.privacyUrl} target="_blank" rel="noopener noreferrer" className="hover:text-gray-600">Privacy</a>
            ) : (
              <span>Privacy</span>
            )}
            {branding.termsUrl ? (
              <a href={branding.termsUrl} target="_blank" rel="noopener noreferrer" className="hover:text-gray-600">Terms</a>
            ) : (
              <span>Terms</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
