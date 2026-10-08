import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TopNav } from "@/components/layout/top-nav";
import { CreatorShell } from "@/components/creator/creator-shell";
import { ThemeScope } from "@/components/theme-scope";
import { ProductNameProvider } from "@/components/product-name";
import { getBranding } from "@/lib/branding";

export default async function CreatorLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "CREATOR") {
    redirect("/student");
  }

  const branding = await getBranding(session.user.id);

  return (
    <ThemeScope color={branding.themeColor} className="min-h-screen bg-gray-50">
      <TopNav role="CREATOR" user={session.user} logoUrl={branding.logoUrl} brandName={branding.brandName} />
      <ProductNameProvider name={branding.productName}>
        <CreatorShell>{children}</CreatorShell>
      </ProductNameProvider>
    </ThemeScope>
  );
}
