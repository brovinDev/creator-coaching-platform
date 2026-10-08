import { NextRequest, NextResponse } from "next/server";
import { getNocodeToken } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";
import { requireCreator, templateFieldsFromBody, templateForEditor } from "@/lib/email-automation";

/** The creator's default confirmation email, used by every service without its own email. */
export async function GET() {
  const creator = await requireCreator();
  if ("error" in creator) return NextResponse.json({ error: creator.error }, { status: creator.status });

  const row = await nocodeDb.creatorEmailSettings.findUnique({ creator_id: creator.user.id }, await getNocodeToken());
  const editor = templateForEditor(row, "default_");
  return NextResponse.json({
    service_title: "",
    exists: !!(editor.subject && (editor.format === "html" ? row?.default_html : editor.body_text)),
    enabled: true,
    ...editor,
  });
}

export async function PUT(req: NextRequest) {
  const creator = await requireCreator();
  if ("error" in creator) return NextResponse.json({ error: creator.error }, { status: creator.status });

  const data = templateFieldsFromBody(await req.json(), "default_");

  const token = await getNocodeToken();
  try {
    const existing = await nocodeDb.creatorEmailSettings.findUnique({ creator_id: creator.user.id }, token);
    if (existing) {
      await nocodeDb.creatorEmailSettings.update(String(existing.id), data, token);
    } else {
      await nocodeDb.creatorEmailSettings.create(
        { creator_id: creator.user.id, confirmation_enabled: true, ...data },
        token
      );
    }
    return NextResponse.json({ message: "Default email saved" });
  } catch (error) {
    console.error("[default-template PUT]", error);
    return NextResponse.json({ error: "Failed to save the default email" }, { status: 500 });
  }
}
