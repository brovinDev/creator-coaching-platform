import { NextRequest, NextResponse } from "next/server";
import { getNocodeToken } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";
import { sendEmail, formatAmount } from "@/lib/email";
import { renderMergeTags } from "@/lib/email-merge-tags";
import { getOwnedService } from "@/lib/email-automation";

type Ctx = { params: Promise<{ serviceId: string }> };

/** Sends the design as it currently stands in the editor to the signed-in creator only. */
export async function POST(req: NextRequest, { params }: Ctx) {
  const { serviceId } = await params;
  const token = await getNocodeToken();
  const owned = await getOwnedService(serviceId, token);
  if ("error" in owned) return NextResponse.json({ error: owned.error }, { status: owned.status });

  const { subject, html } = await req.json();
  if (typeof html !== "string" || !html || typeof subject !== "string" || !subject.trim()) {
    return NextResponse.json({ error: "Add a subject and design the email first" }, { status: 400 });
  }
  const to = owned.user.email;
  if (!to) return NextResponse.json({ error: "Your account has no email address" }, { status: 400 });

  const settings = await nocodeDb.creatorEmailSettings.findUnique({ creator_id: owned.user.id }, token).catch(() => null);
  const currency = String(owned.service.currency || "INR");
  const price = Number(owned.service.price) || 0;
  const values = {
    name: owned.user.name || "there",
    email: to,
    creator_name: owned.user.name || "",
    service_name: String(owned.service.title || ""),
    amount: price > 0 ? formatAmount(price, currency) : "Free",
    transaction_id: "pay_TEST000000",
    dashboard_url: `${process.env.NEXT_PUBLIC_APP_URL}/student`,
  };

  try {
    await sendEmail({
      to,
      subject: `[Test] ${renderMergeTags(subject, values)}`,
      html: renderMergeTags(html, values),
      fromName: String(settings?.from_name || "") || undefined,
      replyTo: String(settings?.reply_to || "") || undefined,
    });
    return NextResponse.json({ message: `Test email sent to ${to}` });
  } catch (error) {
    console.error("[email-template test]", error);
    return NextResponse.json({ error: "Could not send the test email" }, { status: 502 });
  }
}
