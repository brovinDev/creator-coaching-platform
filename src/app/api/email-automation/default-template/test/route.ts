import { NextRequest, NextResponse } from "next/server";
import { getNocodeToken } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";
import { sendEmail } from "@/lib/email";
import { renderMergeTags } from "@/lib/email-merge-tags";
import { requireCreator } from "@/lib/email-automation";

/** Sends the default design as it stands in the editor to the signed-in creator only. */
export async function POST(req: NextRequest) {
  const creator = await requireCreator();
  if ("error" in creator) return NextResponse.json({ error: creator.error }, { status: creator.status });

  const { subject, html } = await req.json();
  if (typeof html !== "string" || !html || typeof subject !== "string" || !subject.trim()) {
    return NextResponse.json({ error: "Add a subject and design the email first" }, { status: 400 });
  }
  const to = creator.user.email;
  if (!to) return NextResponse.json({ error: "Your account has no email address" }, { status: 400 });

  const settings = await nocodeDb.creatorEmailSettings
    .findUnique({ creator_id: creator.user.id }, await getNocodeToken())
    .catch(() => null);
  const values = {
    name: creator.user.name || "there",
    email: to,
    creator_name: creator.user.name || "",
    service_name: "Your service",
    amount: "Free",
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
    console.error("[default-template test]", error);
    return NextResponse.json({ error: "Could not send the test email" }, { status: 502 });
  }
}
