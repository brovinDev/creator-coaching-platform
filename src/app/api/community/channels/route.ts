import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CREATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const community = await db.community.findUnique({ where: { creatorId: session.user.id } });
  if (!community) return NextResponse.json({ error: "No community found" }, { status: 404 });

  const { name, description } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const maxPos = await db.communityChannel.aggregate({
    where: { communityId: community.id },
    _max: { position: true },
  });

  const channel = await db.communityChannel.create({
    data: {
      name,
      description: description || null,
      communityId: community.id,
      position: (maxPos._max.position ?? -1) + 1,
    },
  });

  return NextResponse.json(channel);
}
