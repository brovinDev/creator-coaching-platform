import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { FunnelLanding } from "@/components/funnel/funnel-pages";
import { loadPublicFunnel } from "@/lib/funnel-public";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const data = await loadPublicFunnel((await params).slug);
  if (!data) return {};
  const { content } = data.funnel;
  return {
    title: content.headline || data.funnel.title,
    description: content.subheadline.slice(0, 150),
    openGraph: { title: content.headline || data.funnel.title, description: content.subheadline.slice(0, 150) },
  };
}

export default async function FunnelLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const data = await loadPublicFunnel((await params).slug);
  if (!data) notFound();
  return (
    <FunnelLanding
      content={data.funnel.content}
      theme={data.funnel.theme}
      host={{ brand: data.brand, logo: data.logo }}
      registerHref={data.registerHref}
      priceLabel={data.priceLabel}
    />
  );
}
