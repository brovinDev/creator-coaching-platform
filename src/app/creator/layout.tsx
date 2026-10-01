import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CreatorSidebar } from "@/components/creator/sidebar";

export default async function CreatorLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "CREATOR") {
    redirect("/student");
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <CreatorSidebar user={session.user} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
