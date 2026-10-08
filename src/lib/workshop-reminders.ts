import { nocodeDb } from "@/lib/nocode/db";
import { sendEmail } from "@/lib/email";
import { loadEmailTemplate } from "@/lib/notification-emails";
import type { EmailKind } from "@/lib/email-notifications";
import { idList } from "@/lib/feed";
import { occurrences, type Occurrence } from "@/lib/workshop-time";
import { buildReminderPlaceholderValues, renderEmailTemplate } from "@/lib/email-template-render";
import { dueReminders, postWorkshopDue } from "@/lib/workshop-reminder-schedule";
import { hostNameFor, scheduleOf } from "@/lib/workshops";

type Row = Record<string, unknown>;

const SYSTEM_TOKEN = process.env.NOCODE_SYSTEM_TOKEN || "";
/** Sessions further away than this cannot have a reminder due yet. */
const LOOKAHEAD_MS = 25 * 3600_000;
const BATCH = 5;
/** A session that ended longer ago than this can no longer be due for the post workshop email. */
const AFTER_LOOKBACK_MS = 30 * 60_000;

export interface ReminderRunResult {
  skipped?: "already-running";
  due: number;
  sent: number;
  failed: number;
}

let running = false;

const profileName = (profile: Row | null) =>
  [profile?.first_name, profile?.last_name]
    .filter((p) => typeof p === "string" && p && p !== ".")
    .join(" ")
    .trim();

/** Learners of the linked services, minus customers of the excluded ones, with an email address. */
async function recipientsFor(workshop: Row) {
  const usersOf = async (serviceIds: string[]) => {
    const ids = new Set<string>();
    for (const serviceId of serviceIds) {
      const rows = await nocodeDb.enrollments.findMany({ where: { service_id: serviceId } }, SYSTEM_TOKEN);
      for (const row of rows) if (row.user_id) ids.add(String(row.user_id));
    }
    return ids;
  };

  const included = await usersOf(idList(workshop.service_ids));
  for (const id of await usersOf(idList(workshop.exclude_service_ids))) included.delete(id);

  const users = [...included];
  const found: { email: string; name: string }[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < users.length; i += 10) {
    const profiles = await Promise.all(
      users.slice(i, i + 10).map((userId) => nocodeDb.userProfiles.findUnique({ user_id: userId }, SYSTEM_TOKEN).catch(() => null))
    );
    for (const profile of profiles) {
      const email = String(profile?.email || "").trim();
      if (!email || seen.has(email.toLowerCase())) continue;
      seen.add(email.toLowerCase());
      found.push({ email, name: profileName(profile) });
    }
  }
  return found;
}

export function formatSessionParts(startMs: number, timezone: string) {
  const at = new Date(startMs);
  const date = new Intl.DateTimeFormat("en-IN", { timeZone: timezone, weekday: "short", day: "numeric", month: "short" }).format(at);
  const time = new Intl.DateTimeFormat("en-IN", { timeZone: timezone, hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(at);
  return { date, time, when: `${date}, ${time}` };
}

/** One email that is due for a session: a reminder before it, or the thank-you after it. */
interface DueEmail {
  key: EmailKind;
  /** "in 24 hours"; empty for the post workshop email. */
  phrase: string;
  setting: string;
}

async function sendWorkshopEmail(workshop: Row, startMs: number, due: DueEmail): Promise<{ sent: number; failed: number }> {
  const creatorId = String(workshop.creator_id);
  const schedule = scheduleOf(workshop);
  const [host, settings, recipients, template] = await Promise.all([
    hostNameFor(creatorId, SYSTEM_TOKEN),
    nocodeDb.creatorEmailSettings.findUnique({ creator_id: creatorId }, SYSTEM_TOKEN).catch(() => null),
    recipientsFor(workshop),
    // The creator's own wording if they wrote one (and it is on and complete), otherwise the default.
    loadEmailTemplate(creatorId, due.key),
  ]);
  const fromName = String(settings?.from_name || "") || undefined;
  const replyTo = String(settings?.reply_to || "") || undefined;
  const { date, time } = formatSessionParts(startMs, schedule.timezone);

  let sent = 0;
  let failed = 0;
  for (let i = 0; i < recipients.length; i += BATCH) {
    const results = await Promise.allSettled(
      recipients.slice(i, i + BATCH).map((recipient) => {
        // The meeting link only goes out once the join window is open.
        const joinUrl = due.key === "5m" ? String(workshop.meeting_url || "") : undefined;
        const email = renderEmailTemplate(
          template,
          buildReminderPlaceholderValues({
            learnerName: recipient.name,
            learnerEmail: recipient.email,
            workshopTitle: String(workshop.title || "your workshop"),
            hostName: host,
            date,
            time,
            startsIn: due.phrase,
            link: joinUrl || `${process.env.NEXT_PUBLIC_APP_URL}/student/workshops`,
          })
        );
        return sendEmail({ to: recipient.email, ...email, fromName, replyTo });
      })
    );
    for (const result of results) {
      if (result.status === "fulfilled") sent++;
      else {
        failed++;
        console.error("[workshop-reminders] send failed:", result.reason instanceof Error ? result.reason.message : result.reason);
      }
    }
  }
  return { sent, failed };
}

/** What is due for one session right now. */
function dueFor(occurrence: Occurrence, now: number): DueEmail[] {
  const due: DueEmail[] = dueReminders(occurrence.startMs, now).map((r) => ({ key: r.key, phrase: r.phrase, setting: r.setting }));
  if (postWorkshopDue(occurrence.endMs, now)) {
    due.push({ key: "after15m", phrase: "", setting: "notify_after15m_enabled" });
  }
  return due;
}

/**
 * Sends every workshop email that is due right now: the 24 hour, 1 hour and 5 minute reminders and the post workshop email. Called once a minute (by the backend
 * scheduler through /api/cron/reminders). Safe to call more often: each (workshop, session,
 * reminder) is claimed in `workshop_reminders` before anything is sent, so it goes out at
 * most once. A crash half way through a batch therefore loses the rest rather than emailing
 * the first learners again. One run at a time per server process.
 */
export async function runWorkshopReminders(now = Date.now()): Promise<ReminderRunResult> {
  if (running) return { skipped: "already-running", due: 0, sent: 0, failed: 0 };
  running = true;
  const result: ReminderRunResult = { due: 0, sent: 0, failed: 0 };

  try {
    const workshops = await nocodeDb.workshops.findMany({}, SYSTEM_TOKEN);
    const settingsByCreator = new Map<string, Row | null>();

    for (const workshop of workshops) {
      const creatorId = String(workshop.creator_id);
      const schedule = scheduleOf(workshop);
      if (!schedule.start_date || !schedule.start_time) continue;

      for (const occurrence of occurrences(schedule)) {
        const upcoming = occurrence.startMs > now && occurrence.startMs - now <= LOOKAHEAD_MS;
        const justEnded = occurrence.endMs <= now && now - occurrence.endMs <= AFTER_LOOKBACK_MS;
        if (!upcoming && !justEnded) continue;

        for (const due of dueFor(occurrence, now)) {
          if (!settingsByCreator.has(creatorId)) {
            settingsByCreator.set(
              creatorId,
              await nocodeDb.creatorEmailSettings.findUnique({ creator_id: creatorId }, SYSTEM_TOKEN).catch(() => null)
            );
          }
          // Unset means on; the creator has to switch it off.
          if (settingsByCreator.get(creatorId)?.[due.setting] === false) continue;

          const key = {
            workshop_id: String(workshop.id),
            session_start: new Date(occurrence.startMs).toISOString(),
            reminder: due.key,
          };
          // Not filtered on session_start: the backend never matches an ISO time string in a
          // filter, so a lookup on it would always miss and the email would be sent twice.
          const previous = await nocodeDb.workshopReminders.findMany(
            { where: { workshop_id: key.workshop_id, reminder: key.reminder } },
            SYSTEM_TOKEN
          );
          if (previous.some((row) => row.session_start === key.session_start)) continue;

          const claim = await nocodeDb.workshopReminders.create({ ...key, sent_count: "0", failed_count: "0" }, SYSTEM_TOKEN);
          result.due++;
          try {
            const { sent, failed } = await sendWorkshopEmail(workshop, occurrence.startMs, due);
            result.sent += sent;
            result.failed += failed;
            await nocodeDb.workshopReminders.update(
              String(claim.id),
              { sent_count: String(sent), failed_count: String(failed) },
              SYSTEM_TOKEN
            );
          } catch (error) {
            console.error(`[workshop-reminders] ${due.key} for workshop ${workshop.id} failed:`, error);
          }
        }
      }
    }
  } finally {
    running = false;
  }
  return result;
}
