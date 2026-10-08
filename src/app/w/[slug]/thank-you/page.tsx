import { notFound } from "next/navigation";
import { FunnelThanks } from "@/components/funnel/funnel-pages";
import { THEMES } from "@/lib/funnel";
import { loadPublicFunnel } from "@/lib/funnel-public";

export const metadata = { title: "Registration confirmed" };

export default async function FunnelThankYouPage({ params }: { params: Promise<{ slug: string }> }) {
  const data = await loadPublicFunnel((await params).slug);
  if (!data) notFound();
  return (
    <div className="min-h-screen" style={{ background: THEMES[data.funnel.theme].bg }}>
      <FunnelThanks content={data.funnel.thanks} theme={data.funnel.theme} host={{ brand: data.brand, logo: data.logo }} />
    </div>
  );
}
