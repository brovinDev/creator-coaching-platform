import { NextRequest, NextResponse } from "next/server";
import { getNocodeToken } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";
import { requireCreator } from "@/lib/email-automation";
import { contentFromTestBody, sendKindTest } from "@/lib/email-test";
import { isEmailKind } from "@/lib/email-notifications";

type Ctx = { params: Promise<{ key: string }> };

/** Sends the reminder as it currently stands in the editor to the signed-in creator only. */
export async function POST(req: NextRequest, { params }: Ctx) {
  const creator = await requireCreator();
  if ("error" in creator) return NextResponse.json({ error: creator.error }, { status: creator.status });
  const { key } = await params;
  if (!isEmailKind(key)) return NextResponse.json({ error: "Unknown email" }, { status: 404 });

  const token = await getNocodeToken();
  const rows = await nocodeDb.creatorReminderTemplates.findMany({ where: { creator_id: creator.user.id, reminder: key } }, token);
  const content = contentFromTestBody(await req.json(), { row: rows[0] ?? null, prefix: "" });
  if (typeof content === "string") return NextResponse.json({ error: content }, { status: 400 });
  if (!creator.user.email) return NextResponse.json({ error: "Your account has no email address" }, { status: 400 });

  try {
    await sendKindTest({ user: creator.user, token, content, kind: key });
    return NextResponse.json({ message: `Test email sent to ${creator.user.email}` });
  } catch (error) {
    console.error("[reminder-template test]", error);
    return NextResponse.json({ error: "Could not send the test email" }, { status: 502 });
  }
}
