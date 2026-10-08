import { auth, getNocodeToken } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TopNav } from "@/components/layout/top-nav";
import { ThemeScope } from "@/components/theme-scope";
import { ProductNameProvider } from "@/components/product-name";
import { getLearnerBranding } from "@/lib/branding";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const branding = await getLearnerBranding(session.user.id, await getNocodeToken());

  return (
    <ThemeScope color={branding.themeColor} className="min-h-screen bg-gray-50">
      <TopNav role="STUDENT" user={session.user} logoUrl={branding.logoUrl} brandName={branding.brandName} />
      <ProductNameProvider name={branding.productName}>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </ProductNameProvider>
    </ThemeScope>
  );
}
