import { NextRequest, NextResponse } from "next/server";
import { getNocodeToken } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";
import { requireCreator, templateFieldsFromBody, templateForEditor } from "@/lib/email-automation";
import { contentFromRow } from "@/lib/email-template-render";
import { isReminderKey } from "@/lib/workshop-reminder-schedule";
import { getBranding } from "@/lib/branding";
import { defaultReminderEmail } from "@/lib/workshop-reminder-default";

type Ctx = { params: Promise<{ key: string }> };

async function load(params: Ctx["params"]) {
  const creator = await requireCreator();
  if ("error" in creator) return { error: creator.error, status: creator.status } as const;
  const { key } = await params;
  if (!isReminderKey(key)) return { error: "Unknown reminder", status: 404 } as const;
  const token = await getNocodeToken();
  const rows = await nocodeDb.creatorReminderTemplates.findMany(
    { where: { creator_id: creator.user.id, reminder: key } },
    token
  );
  return { user: creator.user, key, token, row: rows[0] ?? null } as const;
}

/** The creator's own wording for one workshop reminder. No row means the built-in email is sent. */
export async function GET(_req: NextRequest, { params }: Ctx) {
  const found = await load(params);
  if ("error" in found) return NextResponse.json({ error: found.error }, { status: found.status });
  const { user, key, token, row } = found;

  if (!row) {
    // Nothing saved: open on the email learners get today, with this creator's logo and colour.
    const branding = await getBranding(user.id, token);
    const fallback = defaultReminderEmail(key, {
      logoUrl: branding.emailLogoUrl || branding.logoUrl || undefined,
      color: branding.themeColor || undefined,
    });
    return NextResponse.json({
      service_title: "",
      exists: false,
      enabled: false,
      subject: fallback.subject,
      format: "html",
      body_text: "",
      design_json: JSON.stringify(fallback.design),
      default_html: fallback.html,
    });
  }
  return NextResponse.json({
    service_title: "",
    exists: true,
    enabled: !!row.enabled,
    ...templateForEditor(row, ""),
  });
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const found = await load(params);
  if ("error" in found) return NextResponse.json({ error: found.error }, { status: found.status });
  const { user, key, token, row } = found;

  const body = await req.json().catch(() => ({}));
  const data = templateFieldsFromBody(body, "");
  if (typeof body.enabled === "boolean") data.enabled = body.enabled;
  if (data.enabled === true && !contentFromRow({ ...row, ...data }, "")) {
    return NextResponse.json({ error: "Write the email and add a subject before enabling it" }, { status: 400 });
  }

  try {
    if (row) await nocodeDb.creatorReminderTemplates.update(String(row.id), data, token);
    else await nocodeDb.creatorReminderTemplates.create({ creator_id: user.id, reminder: key, enabled: false, ...data }, token);
    return NextResponse.json({ message: "Reminder email saved" });
  } catch (error) {
    console.error("[reminder-template PUT]", error);
    return NextResponse.json({ error: "Failed to save the reminder email" }, { status: 500 });
  }
}

/** Reset: drop the custom email so the built-in reminder is sent again. */
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const found = await load(params);
  if ("error" in found) return NextResponse.json({ error: found.error }, { status: found.status });
  try {
    if (found.row) await nocodeDb.creatorReminderTemplates.delete(String(found.row.id), found.token);
    return NextResponse.json({ message: "Reset to the built-in reminder" });
  } catch (error) {
    console.error("[reminder-template DELETE]", error);
    return NextResponse.json({ error: "Failed to reset the reminder email" }, { status: 500 });
  }
}
