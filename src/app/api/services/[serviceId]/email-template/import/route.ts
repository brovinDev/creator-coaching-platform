import { NextRequest, NextResponse } from "next/server";
import { getNocodeToken } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";
import { getOwnedService, templateForEditor } from "@/lib/email-automation";
import { contentFromRow } from "@/lib/email-template-render";

type Ctx = { params: Promise<{ serviceId: string }> };

/**
 * Copies another of the creator's services' email into this one. A source without its own
 * design sends the creator's default, so that is what gets copied.
 */
export async function POST(req: NextRequest, { params }: Ctx) {
  const { serviceId } = await params;
  const token = await getNocodeToken();

  const target = await getOwnedService(serviceId, token);
  if ("error" in target) return NextResponse.json({ error: target.error }, { status: target.status });

  const { from_service_id } = await req.json();
  if (!from_service_id || String(from_service_id) === serviceId) {
    return NextResponse.json({ error: "Choose a different service to import from" }, { status: 400 });
  }

  // Ownership of the source matters too: otherwise any creator could read another's design.
  const source = await getOwnedService(String(from_service_id), token);
  if ("error" in source) return NextResponse.json({ error: "Service not found" }, { status: 404 });

  const template = await nocodeDb.serviceEmailTemplates.findUnique({ service_id: String(from_service_id) }, token);
  let copy: Record<string, unknown> | null = null;
  if (contentFromRow(template, "")) {
    copy = {
      subject: template!.subject,
      format: templateForEditor(template, "").format,
      body_text: template!.body_text,
      design_json: template!.design_json,
      html: template!.html,
    };
  } else {
    const settings = await nocodeDb.creatorEmailSettings.findUnique({ creator_id: source.user.id }, token);
    if (contentFromRow(settings, "default_")) {
      copy = {
        subject: settings!.default_subject,
        format: templateForEditor(settings, "default_").format,
        body_text: settings!.default_body_text,
        design_json: settings!.default_design_json,
        html: settings!.default_html,
      };
    }
  }
  if (!copy) {
    return NextResponse.json({ error: "That service has no email design to import" }, { status: 400 });
  }
  try {
    const existing = await nocodeDb.serviceEmailTemplates.findUnique({ service_id: serviceId }, token);
    if (existing) {
      await nocodeDb.serviceEmailTemplates.update(String(existing.id), copy, token);
    } else {
      await nocodeDb.serviceEmailTemplates.create({ service_id: serviceId, enabled: true, ...copy }, token);
    }
    return NextResponse.json({ message: "Template imported" });
  } catch (error) {
    console.error("[email-template import]", error);
    return NextResponse.json({ error: "Failed to import template" }, { status: 500 });
  }
}
