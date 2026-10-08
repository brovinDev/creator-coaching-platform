import { auth } from "@/lib/auth";
import { WorkshopList } from "@/components/workshops/workshop-list";

export default async function CreatorWorkshopsPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const [session, { new: openNew }] = await Promise.all([auth(), searchParams]);
  return <WorkshopList isCreator hostName={session!.user.name} openNew={openNew === "1"} />;
}
