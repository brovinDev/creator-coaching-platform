import { NextRequest, NextResponse } from "next/server";
import { getNocodeToken } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";
import { getOwnedService } from "@/lib/email-automation";

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
    subject: row?.subject || "",
    design_json: row?.design_json || null,
    enabled: !!row?.enabled,
  });
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const { serviceId } = await params;
  const token = await getNocodeToken();
  const owned = await getOwnedService(serviceId, token);
  if ("error" in owned) return NextResponse.json({ error: owned.error }, { status: owned.status });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (typeof body.subject === "string") data.subject = body.subject.slice(0, 200);
  if (typeof body.enabled === "boolean") data.enabled = body.enabled;
  if (typeof body.design_json === "string") data.design_json = body.design_json;
  if (typeof body.html === "string") data.html = body.html;

  if (data.enabled === true) {
    const existing = await nocodeDb.serviceEmailTemplates.findUnique({ service_id: serviceId }, token);
    const hasHtml = (typeof data.html === "string" && data.html) || existing?.html;
    if (!hasHtml || !(data.subject || existing?.subject)) {
      return NextResponse.json(
        { error: "Design the email and add a subject before enabling it" },
        { status: 400 }
      );
    }
  }

  try {
    const existing = await nocodeDb.serviceEmailTemplates.findUnique({ service_id: serviceId }, token);
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

/** Reset: drop the custom design so the service goes back to the default email. */
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
