import { NextRequest, NextResponse } from "next/server";
import { getNocodeToken } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";
import { isValidEmail, requireCreator } from "@/lib/email-automation";
import { REMINDERS } from "@/lib/workshop-reminder-schedule";
import { contentFromRow } from "@/lib/email-template-render";

export async function GET() {
  const creator = await requireCreator();
  if ("error" in creator) return NextResponse.json({ error: creator.error }, { status: creator.status });

  const token = await getNocodeToken();
  const row = await nocodeDb.creatorEmailSettings.findUnique({ creator_id: creator.user.id }, token);
  // Which reminders have the creator's own wording in use (written, and not switched off).
  const templates = await nocodeDb.creatorReminderTemplates
    .findMany({ where: { creator_id: creator.user.id } }, token)
    .catch(() => []);
  const custom = Object.fromEntries(
    REMINDERS.map((r) => [
      r.key,
      templates.some((t) => t.reminder === r.key && t.enabled !== false && !!contentFromRow(t, "")),
    ])
  );
  return NextResponse.json({
    reminder_custom: custom,
    from_name: String(row?.from_name || ""),
    reply_to: String(row?.reply_to || ""),
    // Unset means on.
    confirmation_enabled: row?.confirmation_enabled !== false,
    // Workshop reminders, also on unless switched off.
    ...Object.fromEntries(REMINDERS.map((r) => [r.setting, row?.[r.setting] !== false])),
  });
}

export async function PUT(req: NextRequest) {
  const creator = await requireCreator();
  if ("error" in creator) return NextResponse.json({ error: creator.error }, { status: creator.status });

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (typeof body.from_name === "string") {
    const fromName = body.from_name.replace(/[\r\n"<>]/g, "").trim();
    if (!fromName) return NextResponse.json({ error: "From name is required" }, { status: 400 });
    data.from_name = fromName.slice(0, 100);
  }
  if (typeof body.reply_to === "string") {
    const replyTo = body.reply_to.trim();
    if (!replyTo) return NextResponse.json({ error: "Reply to email address is required" }, { status: 400 });
    if (!isValidEmail(replyTo)) return NextResponse.json({ error: "Enter a valid reply to email address" }, { status: 400 });
    data.reply_to = replyTo;
  }
  if (typeof body.confirmation_enabled === "boolean") data.confirmation_enabled = body.confirmation_enabled;
  for (const reminder of REMINDERS) {
    if (typeof body[reminder.setting] === "boolean") data[reminder.setting] = body[reminder.setting];
  }

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
    return NextResponse.json({ message: "Email settings saved" });
  } catch (error) {
    console.error("[email-automation settings PUT]", error);
    return NextResponse.json({ error: "Failed to save email settings" }, { status: 500 });
  }
}
