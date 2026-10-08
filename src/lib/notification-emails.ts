import { nocodeDb } from "@/lib/nocode/db";
import { getBranding } from "@/lib/branding";
import { sendEmail } from "@/lib/email";
import { contentFromRow, renderEmailTemplate, type EmailTemplateContent } from "@/lib/email-template-render";
import { emailKindInfo, type EmailKind } from "@/lib/email-notifications";
import { defaultEmailFor } from "@/lib/notification-default";

const SYSTEM_TOKEN = process.env.NOCODE_SYSTEM_TOKEN || "";

type Row = Record<string, unknown>;

/** Whether the creator has this email switched on. Unset means on. */
export async function isEmailOn(creatorId: string, kind: EmailKind, settings?: Row | null) {
  const row =
    settings === undefined
      ? await nocodeDb.creatorEmailSettings.findUnique({ creator_id: creatorId }, SYSTEM_TOKEN).catch(() => null)
      : settings;
  return row?.[emailKindInfo(kind).setting] !== false;
}

/**
 * What to send for this email: the creator's own version when they wrote one (and it is on and
 * complete), otherwise the default, carrying their logo and theme colour.
 */
export async function loadEmailTemplate(creatorId: string, kind: EmailKind): Promise<EmailTemplateContent> {
  const [rows, branding] = await Promise.all([
    nocodeDb.creatorReminderTemplates.findMany({ where: { creator_id: creatorId, reminder: kind } }, SYSTEM_TOKEN).catch(() => [] as Row[]),
    getBranding(creatorId, SYSTEM_TOKEN),
  ]);
  const custom = contentFromRow(rows.find((row) => row.enabled !== false) ?? null, "");
  if (custom) return custom;

  const fallback = defaultEmailFor(kind, {
    logoUrl: branding.emailLogoUrl || branding.logoUrl || undefined,
    color: branding.themeColor || undefined,
  });
  return { subject: fallback.subject, format: "html", html: fallback.html, body_text: fallback.text };
}

/**
 * Sends one notification on behalf of a creator, honouring their on/off switch, their own
 * wording and their sender name. Never throws: a failed notification must not fail the action
 * (a comment, a reply) that caused it. Returns whether an email went out.
 */
export async function sendNotificationEmail(opts: {
  creatorId: string;
  kind: EmailKind;
  to: string;
  values: Record<string, string>;
}): Promise<boolean> {
  try {
    const settings = await nocodeDb.creatorEmailSettings.findUnique({ creator_id: opts.creatorId }, SYSTEM_TOKEN).catch(() => null);
    if (!(await isEmailOn(opts.creatorId, opts.kind, settings))) return false;
    const rendered = renderEmailTemplate(await loadEmailTemplate(opts.creatorId, opts.kind), opts.values);
    await sendEmail({
      to: opts.to,
      ...rendered,
      fromName: String(settings?.from_name || "") || undefined,
      replyTo: String(settings?.reply_to || "") || undefined,
    });
    return true;
  } catch (error) {
    console.error(`[notification-emails] ${opts.kind} failed:`, error instanceof Error ? error.message : error);
    return false;
  }
}
