import { NextRequest, NextResponse } from "next/server";
import { getNocodeToken } from "@/lib/auth";
import { getOwnedService } from "@/lib/email-automation";
import { nocodeDb } from "@/lib/nocode/db";
import { contentFromTestBody, sendTemplateTest } from "@/lib/email-test";

type Ctx = { params: Promise<{ serviceId: string }> };

/** Sends the email as it currently stands in the editor to the signed-in creator only. */
export async function POST(req: NextRequest, { params }: Ctx) {
  const { serviceId } = await params;
  const token = await getNocodeToken();
  const owned = await getOwnedService(serviceId, token);
  if ("error" in owned) return NextResponse.json({ error: owned.error }, { status: owned.status });

  const saved = await nocodeDb.serviceEmailTemplates.findUnique({ service_id: serviceId }, token);
  const content = contentFromTestBody(await req.json(), { row: saved, prefix: "" });
  if (typeof content === "string") return NextResponse.json({ error: content }, { status: 400 });
  if (!owned.user.email) return NextResponse.json({ error: "Your account has no email address" }, { status: 400 });

  try {
    await sendTemplateTest({ user: owned.user, token, content, service: owned.service });
    return NextResponse.json({ message: `Test email sent to ${owned.user.email}` });
  } catch (error) {
    console.error("[email-template test]", error);
    return NextResponse.json({ error: "Could not send the test email" }, { status: 502 });
  }
}
