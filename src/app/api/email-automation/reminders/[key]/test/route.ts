import { NextRequest, NextResponse } from "next/server";
import { getNocodeToken } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";
import { requireCreator } from "@/lib/email-automation";
import { contentFromTestBody, sendReminderTest } from "@/lib/email-test";
import { REMINDERS, isReminderKey } from "@/lib/workshop-reminder-schedule";

type Ctx = { params: Promise<{ key: string }> };

/** Sends the reminder as it currently stands in the editor to the signed-in creator only. */
export async function POST(req: NextRequest, { params }: Ctx) {
  const creator = await requireCreator();
  if ("error" in creator) return NextResponse.json({ error: creator.error }, { status: creator.status });
  const { key } = await params;
  if (!isReminderKey(key)) return NextResponse.json({ error: "Unknown reminder" }, { status: 404 });

  const token = await getNocodeToken();
  const rows = await nocodeDb.creatorReminderTemplates.findMany({ where: { creator_id: creator.user.id, reminder: key } }, token);
  const content = contentFromTestBody(await req.json(), { row: rows[0] ?? null, prefix: "" });
  if (typeof content === "string") return NextResponse.json({ error: content }, { status: 400 });
  if (!creator.user.email) return NextResponse.json({ error: "Your account has no email address" }, { status: 400 });

  try {
    await sendReminderTest({
      user: creator.user,
      token,
      content,
      startsIn: REMINDERS.find((r) => r.key === key)!.phrase,
    });
    return NextResponse.json({ message: `Test email sent to ${creator.user.email}` });
  } catch (error) {
    console.error("[reminder-template test]", error);
    return NextResponse.json({ error: "Could not send the test email" }, { status: 502 });
  }
}
