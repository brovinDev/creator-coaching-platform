import { NextRequest, NextResponse } from "next/server";
import { auth, getNocodeToken } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Saves the "about you" survey a new creator fills in after signing up. Every answer is optional. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const socials = Array.isArray(body.socials)
    ? body.socials
        .slice(0, 10)
        .map((s: Record<string, unknown>) => ({ platform: str(s?.platform, 30), url: str(s?.url, 300) }))
        .filter((s: { url: string }) => s.url)
    : [];

  const answers = {
    stage: str(body.stage, 60),
    revenue: str(body.revenue, 30),
    source: str(body.source, 60),
    whiteLabel: str(body.whiteLabel, 30),
    socials,
    skipped: body.skipped === true,
  };

  const token = await getNocodeToken();
  const profile = await nocodeDb.userProfiles.findUnique({ user_id: session.user.id }, token);
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  await nocodeDb.userProfiles.update(
    String(profile.id),
    { onboarding: JSON.stringify(answers), onboarding_done: "true" },
    token
  );

  return NextResponse.json({ ok: true });
}
