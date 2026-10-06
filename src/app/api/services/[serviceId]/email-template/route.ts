import { NextRequest, NextResponse } from "next/server";
import { getNocodeToken } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";
import { getOwnedService, templateFieldsFromBody, templateForEditor } from "@/lib/email-automation";
import { contentFromRow } from "@/lib/email-template-render";

type Ctx = { params: Promise<{ serviceId: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { serviceId } = await params;
  const token = await getNocodeToken();
  const owned = await getOwnedService(serviceId, token);
  if ("error" in owned) return NextResponse.json({ error: owned.error }, { status: owned.status });

  const row = await nocodeDb.serviceEmailTemplates.findUnique({ service_id: serviceId }, token);
  return NextResponse.json({
    service_title: String(owned.service.title || ""),
    exists: !!row,
    enabled: !!row?.enabled,
    ...templateForEditor(row, ""),
  });
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const { serviceId } = await params;
  const token = await getNocodeToken();
  const owned = await getOwnedService(serviceId, token);
  if ("error" in owned) return NextResponse.json({ error: owned.error }, { status: owned.status });

  const body = await req.json();
  const data = templateFieldsFromBody(body, "");
  if (typeof body.enabled === "boolean") data.enabled = body.enabled;

  try {
    const existing = await nocodeDb.serviceEmailTemplates.findUnique({ service_id: serviceId }, token);

    // Turning an email on needs something to send, whichever editor made it.
    if (data.enabled === true && !contentFromRow({ ...existing, ...data }, "")) {
      return NextResponse.json({ error: "Write the email and add a subject before enabling it" }, { status: 400 });
    }

    if (existing) {
      await nocodeDb.serviceEmailTemplates.update(String(existing.id), data, token);
    } else {
      await nocodeDb.serviceEmailTemplates.create({ service_id: serviceId, enabled: false, ...data }, token);
    }
    return NextResponse.json({ message: "Email template saved" });
  } catch (error) {
    console.error("[email-template PUT]", error);
    return NextResponse.json({ error: "Failed to save email template" }, { status: 500 });
  }
}

/** Reset: drop the custom email so the service goes back to the default. */
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { serviceId } = await params;
  const token = await getNocodeToken();
  const owned = await getOwnedService(serviceId, token);
  if ("error" in owned) return NextResponse.json({ error: owned.error }, { status: owned.status });

  try {
    const existing = await nocodeDb.serviceEmailTemplates.findUnique({ service_id: serviceId }, token);
    if (existing) await nocodeDb.serviceEmailTemplates.delete(String(existing.id), token);
    return NextResponse.json({ message: "Reset to the default email" });
  } catch (error) {
    console.error("[email-template DELETE]", error);
    return NextResponse.json({ error: "Failed to reset email template" }, { status: 500 });
  }
}
