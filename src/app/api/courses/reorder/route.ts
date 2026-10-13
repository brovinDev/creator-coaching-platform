import { NextRequest, NextResponse } from "next/server";
import { auth, getNocodeToken } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";

/** Save the order of the creator's courses: { ids: string[] } from first to last. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CREATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ids } = await req.json().catch(() => ({}));
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids are required" }, { status: 400 });
  }

  const token = await getNocodeToken();
  const mine = new Set(
    (await nocodeDb.courses.findMany({ where: { creator_id: session.user.id } }, token)).map((c) => String(c.id))
  );
  const order = ids.map(String).filter((id) => mine.has(id));

  await Promise.all(order.map((id, index) => nocodeDb.courses.update(id, { position: String(index) }, token)));

  return NextResponse.json({ ok: true });
}
