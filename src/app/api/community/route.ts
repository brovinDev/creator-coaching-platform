import { NextResponse } from "next/server";
import { auth, getNocodeToken } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = await getNocodeToken();

  if (session.user.role === "CREATOR") {
    const communities = await nocodeDb.communities.findMany(
      { where: { creator_id: session.user.id } },
      token
    );
    if (communities.length === 0) return NextResponse.json([]);

    const community = communities[0];
    const channels = await nocodeDb.communityChannels.findMany(
      { where: { community_id: String(community.id) }, orderBy: { position: "asc" } },
      token
    );

    const channelsWithCount = await Promise.all(
      channels.map(async (ch) => {
        const postCount = await nocodeDb.communityPosts.count({ channel_id: String(ch.id) }, token);
        return { ...ch, _count: { posts: postCount } };
      })
    );

    return NextResponse.json([{ ...community, channels: channelsWithCount }]);
  }

  const enrollments = await nocodeDb.enrollments.findMany(
    { where: { user_id: session.user.id } },
    token
  );

  if (enrollments.length === 0) return NextResponse.json([]);

  const courseIdSet = new Set<string>();
  for (const e of enrollments) {
    if (e.course_id) courseIdSet.add(String(e.course_id));
    if (e.service_id) {
      const svc = await nocodeDb.services.findUnique({ id: String(e.service_id) }, token);
      if (svc?.course_id) {
        String(svc.course_id).split(",").filter(Boolean).forEach((cid) => courseIdSet.add(cid.trim()));
      }
    }
  }

  const courses = await Promise.all(
    Array.from(courseIdSet).map((cid) => nocodeDb.courses.findUnique({ id: cid }, token))
  );

  const creatorIds = [...new Set(courses.filter(Boolean).map((c) => String(c!.creator_id)))];

  const allCommunities = await Promise.all(
    creatorIds.map(async (cid) => {
      const comms = await nocodeDb.communities.findMany({ where: { creator_id: cid } }, token);
      return comms;
    })
  );

  const communities = allCommunities.flat();

  const communitiesWithChannels = await Promise.all(
    communities.map(async (community) => {
      const channels = await nocodeDb.communityChannels.findMany(
        { where: { community_id: String(community.id) }, orderBy: { position: "asc" } },
        token
      );
      const channelsWithCount = await Promise.all(
        channels.map(async (ch) => {
          const postCount = await nocodeDb.communityPosts.count({ channel_id: String(ch.id) }, token);
          return { ...ch, _count: { posts: postCount } };
        })
      );
      return { ...community, channels: channelsWithCount };
    })
  );

  return NextResponse.json(communitiesWithChannels);
}
