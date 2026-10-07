import { NextRequest, NextResponse } from "next/server";
import { requireCreator } from "@/lib/email-automation";
import { htmlToPlainText } from "@/lib/email-template-render";

/** Plain-text version of a design's HTML, for the editor's "Generate from design" button. */
export async function POST(req: NextRequest) {
  const creator = await requireCreator();
  if ("error" in creator) return NextResponse.json({ error: creator.error }, { status: creator.status });

  const { html } = await req.json().catch(() => ({}));
  if (typeof html !== "string" || !html.trim()) {
    return NextResponse.json({ error: "Design the email first" }, { status: 400 });
  }
  if (html.length > 2_000_000) {
    return NextResponse.json({ error: "The design is too large to convert" }, { status: 413 });
  }
  return NextResponse.json({ text: htmlToPlainText(html) });
}
