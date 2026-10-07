import { nocodeDb } from "@/lib/nocode/db";
import {
  formatAmount,
  sendEmail,
  serviceRegistrationEmail,
  serviceSaleNotificationEmail,
} from "@/lib/email";
import {
  buildPlaceholderValues,
  contentFromRow,
  renderEmailTemplate,
  type EmailTemplateContent,
} from "@/lib/email-template-render";

const SYSTEM_TOKEN = process.env.NOCODE_SYSTEM_TOKEN || "";

export interface RegistrationEmailInput {
  userId: string;
  /** Preferred over the profile — comes from the signed-in session. */
  learner?: { name?: string | null; email?: string | null };
  serviceId?: string | null;
  /** Used only for legacy course-only enrollments that have no service. */
  courseId?: string | null;
  /** Amount actually paid. Omit or pass 0 for free registrations. */
  amount?: number;
  transactionId?: string;
}

export interface RegistrationEmailResult {
  /** Title of the service (or course) the learner registered for. */
  name: string;
  learnerSent: boolean;
  creatorSent: boolean;
}

function profileName(profile: Record<string, unknown> | null) {
  if (!profile) return "";
  return [profile.first_name, profile.last_name]
    .filter((p) => typeof p === "string" && p && p !== ".")
    .join(" ")
    .trim();
}

/**
 * Sends the learner's registration email and the creator's notification.
 * Never throws — a failed email must not undo or fail a completed registration.
 */
export async function sendRegistrationEmails(
  input: RegistrationEmailInput
): Promise<RegistrationEmailResult> {
  const result: RegistrationEmailResult = { name: "", learnerSent: false, creatorSent: false };

  try {
    let name = "";
    let currency = "INR";
    let startDate: string | null = null;
    let creatorId = "";

    if (input.serviceId) {
      const service = await nocodeDb.services.findUnique({ id: input.serviceId }, SYSTEM_TOKEN);
      if (service) {
        name = String(service.title || "");
        currency = String(service.currency || "INR");
        startDate = (service.start_date as string) || null;
        creatorId = String(service.creator_id || "");
      }
    }
    if ((!name || !creatorId) && input.courseId) {
      const course = await nocodeDb.courses.findUnique({ id: input.courseId }, SYSTEM_TOKEN);
      if (course) {
        name = name || String(course.title || "");
        creatorId = creatorId || String(course.creator_id || "");
      }
    }
    name = name || "your service";
    result.name = name;

    let learnerEmail = input.learner?.email || "";
    let learnerName = input.learner?.name || "";
    if (!learnerEmail || !learnerName) {
      const profile = await nocodeDb.userProfiles
        .findUnique({ user_id: input.userId }, SYSTEM_TOKEN)
        .catch(() => null);
      learnerEmail = learnerEmail || String(profile?.email || "");
      learnerName = learnerName || profileName(profile);
    }

    const sends: Promise<void>[] = [];

    const creator = creatorId
      ? await nocodeDb.userProfiles.findUnique({ user_id: creatorId }, SYSTEM_TOKEN).catch(() => null)
      : null;
    const settings = creatorId
      ? await nocodeDb.creatorEmailSettings.findUnique({ creator_id: creatorId }, SYSTEM_TOKEN).catch(() => null)
      : null;
    const fromName = String(settings?.from_name || "") || undefined;
    const replyTo = String(settings?.reply_to || "") || undefined;
    // Unset means on; the creator has to switch it off explicitly.
    const confirmationOn = settings?.confirmation_enabled !== false;

    if (learnerEmail && !confirmationOn) {
      console.log(`[registration-emails] Confirmation email switched off by creator ${creatorId}; skipping learner email`);
    } else if (learnerEmail) {
      let content: { subject: string; html: string; text?: string } | null = null;

      // Order: this service's own email, then the creator's default, then the built-in email.
      const paid = (input.amount ?? 0) > 0;
      const values = buildPlaceholderValues({
        learnerName,
        learnerEmail,
        creatorName: profileName(creator),
        serviceName: name,
        amount: paid ? formatAmount(input.amount!, currency) : "Free",
        transactionId: input.transactionId || "",
      });

      let template: EmailTemplateContent | null = null;
      if (input.serviceId) {
        const custom = await nocodeDb.serviceEmailTemplates
          .findUnique({ service_id: input.serviceId }, SYSTEM_TOKEN)
          .catch(() => null);
        if (custom?.enabled) template = contentFromRow(custom, "");
      }
      template ??= contentFromRow(settings, "default_");
      if (template) content = renderEmailTemplate(template, values);

      content ??= serviceRegistrationEmail({
        name: learnerName,
        serviceName: name,
        amount: input.amount,
        currency,
        transactionId: input.transactionId,
        startDate,
      });
      sends.push(
        sendEmail({ to: learnerEmail, fromName, replyTo, ...content }).then(() => {
          result.learnerSent = true;
        })
      );
    } else {
      console.warn(`[registration-emails] No email address for learner ${input.userId}; skipping learner email`);
    }

    if (creatorId) {
      const creatorEmail = String(creator?.email || "");
      if (creatorEmail) {
        const content = serviceSaleNotificationEmail({
          creatorName: profileName(creator),
          learnerName,
          learnerEmail,
          serviceName: name,
          amount: input.amount,
          currency,
        });
        sends.push(
          sendEmail({ to: creatorEmail, ...content }).then(() => {
            result.creatorSent = true;
          })
        );
      } else {
        console.warn(
          `[registration-emails] No email on profile for creator ${creatorId}; they will be backfilled on their next sign-in`
        );
      }
    }

    const outcomes = await Promise.allSettled(sends);
    for (const o of outcomes) {
      if (o.status === "rejected") console.error("[registration-emails] Send failed:", o.reason);
    }
  } catch (error) {
    console.error("[registration-emails] Unexpected error:", error);
  }

  return result;
}
