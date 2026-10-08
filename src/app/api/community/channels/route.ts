import { NextRequest, NextResponse } from "next/server";
import { auth, getNocodeToken } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CREATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await getNocodeToken();

  const communities = await nocodeDb.communities.findMany(
    { where: { creator_id: session.user.id } },
    token
  );
  if (communities.length === 0) {
    return NextResponse.json({ error: "No community found" }, { status: 404 });
  }

  const community = communities[0];
  const { name, description } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const existingChannels = await nocodeDb.communityChannels.findMany(
    { where: { community_id: String(community.id) }, orderBy: { position: "desc" } },
    token
  );
  const maxPos = existingChannels.length > 0 ? Number(existingChannels[0].position) || 0 : -1;

  const channel = await nocodeDb.communityChannels.create(
    {
      name,
      description: description || null,
      community_id: String(community.id),
      position: maxPos + 1,
    },
    token
  );

  return NextResponse.json(channel);
}
