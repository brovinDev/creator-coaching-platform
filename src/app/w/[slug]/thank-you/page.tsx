import { notFound } from "next/navigation";
import { FunnelThanks } from "@/components/funnel/funnel-pages";
import { loadPublicFunnel } from "@/lib/funnel-public";

export const metadata = { title: "Registration confirmed" };

export default async function FunnelThankYouPage({ params }: { params: Promise<{ slug: string }> }) {
  const data = await loadPublicFunnel((await params).slug);
  if (!data) notFound();
  return <FunnelThanks content={data.funnel.thanks} theme={data.funnel.theme} host={{ brand: data.brand, logo: data.logo }} />;
}
