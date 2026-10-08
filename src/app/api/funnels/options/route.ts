import { NextResponse } from "next/server";
import { auth, getNocodeToken } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";
import { idList } from "@/lib/feed";
import { eventOfWorkshop } from "@/lib/funnel-event";

/** The creator's workshops, each with the event details its page would show. */
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "CREATOR") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = await getNocodeToken();
  const workshops = await nocodeDb.workshops.findMany({ where: { creator_id: session.user.id } }, token);
  return NextResponse.json(
    workshops.map((w) => ({
      id: String(w.id),
      title: String(w.title || ""),
      description: String(w.description || ""),
      recurring: w.recurring === true || w.recurring === "true",
      serviceIds: idList(w.service_ids),
      event: eventOfWorkshop(w),
    }))
  );
}
