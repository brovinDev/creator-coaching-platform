import { NextRequest, NextResponse } from "next/server";
import { getNocodeToken } from "@/lib/auth";
import { requireCreator } from "@/lib/email-automation";
import { nocodeDb } from "@/lib/nocode/db";
import { contentFromTestBody, sendTemplateTest } from "@/lib/email-test";

/** Sends the default email as it currently stands in the editor to the signed-in creator only. */
export async function POST(req: NextRequest) {
  const creator = await requireCreator();
  if ("error" in creator) return NextResponse.json({ error: creator.error }, { status: creator.status });

  const token = await getNocodeToken();
  const saved = await nocodeDb.creatorEmailSettings.findUnique({ creator_id: creator.user.id }, token);
  const content = contentFromTestBody(await req.json(), { row: saved, prefix: "default_" });
  if (typeof content === "string") return NextResponse.json({ error: content }, { status: 400 });
  if (!creator.user.email) return NextResponse.json({ error: "Your account has no email address" }, { status: 400 });

  try {
    await sendTemplateTest({ user: creator.user, token, content });
    return NextResponse.json({ message: `Test email sent to ${creator.user.email}` });
  } catch (error) {
    console.error("[default-template test]", error);
    return NextResponse.json({ error: "Could not send the test email" }, { status: 502 });
  }
}
