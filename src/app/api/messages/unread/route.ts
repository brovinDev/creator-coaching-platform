import { NextRequest, NextResponse } from "next/server";
import { auth, getNocodeToken } from "@/lib/auth";
import { listRooms } from "@/lib/messages";

/** How many unread messages the signed-in user has across all rooms (for the badge in the header). */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ unread: 0 });
  // The room the reader has open is left out: it is on screen, so it counts as read.
  const exclude = req.nextUrl.searchParams.get("exclude");
  const result = await listRooms(session.user, await getNocodeToken()).catch(() => null);
  const unread = result ? result.rooms.filter((r) => r.id !== exclude).reduce((n, r) => n + r.unread, 0) : 0;
  return NextResponse.json({ unread });
}
