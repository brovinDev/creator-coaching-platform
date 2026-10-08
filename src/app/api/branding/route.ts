import { NextRequest, NextResponse } from "next/server";
import { getNocodeToken } from "@/lib/auth";
import { requireCreator } from "@/lib/email-automation";
import { nocodeDb } from "@/lib/nocode/db";
import { brandingFieldsFromBody, brandingFromRow } from "@/lib/branding";

export async function GET() {
  const creator = await requireCreator();
  if ("error" in creator) return NextResponse.json({ error: creator.error }, { status: creator.status });

  const token = await getNocodeToken();
  const row = await nocodeDb.creatorBranding.findUnique({ creator_id: creator.user.id }, token).catch(() => null);
  return NextResponse.json(brandingFromRow(row));
}

export async function PUT(req: NextRequest) {
  const creator = await requireCreator();
  if ("error" in creator) return NextResponse.json({ error: creator.error }, { status: creator.status });

  const fields = brandingFieldsFromBody(await req.json());
  if (typeof fields === "string") return NextResponse.json({ error: fields }, { status: 400 });

  const token = await getNocodeToken();
  try {
    const existing = await nocodeDb.creatorBranding.findUnique({ creator_id: creator.user.id }, token);
    if (existing) await nocodeDb.creatorBranding.update(String(existing.id), fields, token);
    else await nocodeDb.creatorBranding.create({ creator_id: creator.user.id, ...fields }, token);
    const row = { ...(existing || {}), ...fields };
    return NextResponse.json(brandingFromRow(row));
  } catch (error) {
    console.error("[branding] save failed", error);
    return NextResponse.json({ error: "Could not save branding" }, { status: 500 });
  }
}
