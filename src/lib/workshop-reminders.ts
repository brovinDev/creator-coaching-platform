import { nocodeDb } from "@/lib/nocode/db";
import { getBranding } from "@/lib/branding";
import { sendEmail, workshopReminderEmail } from "@/lib/email";
import { idList } from "@/lib/feed";
import { occurrences } from "@/lib/workshop-time";
import { dueReminders, type ReminderKind } from "@/lib/workshop-reminder-schedule";
import { hostNameFor, scheduleOf } from "@/lib/workshops";

type Row = Record<string, unknown>;

const SYSTEM_TOKEN = process.env.NOCODE_SYSTEM_TOKEN || "";
/** Sessions further away than this cannot have a reminder due yet. */
const LOOKAHEAD_MS = 25 * 3600_000;
const BATCH = 5;

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

function formatWhen(startMs: number, timezone: string) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: timezone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(startMs));
}

async function sendReminder(workshop: Row, startMs: number, reminder: ReminderKind): Promise<{ sent: number; failed: number }> {
  const creatorId = String(workshop.creator_id);
  const schedule = scheduleOf(workshop);
  const [branding, host, settings, recipients] = await Promise.all([
    getBranding(creatorId, SYSTEM_TOKEN),
    hostNameFor(creatorId, SYSTEM_TOKEN),
    nocodeDb.creatorEmailSettings.findUnique({ creator_id: creatorId }, SYSTEM_TOKEN).catch(() => null),
    recipientsFor(workshop),
  ]);
  const fromName = String(settings?.from_name || "") || undefined;
  const replyTo = String(settings?.reply_to || "") || undefined;
  const when = formatWhen(startMs, schedule.timezone);

  let sent = 0;
  let failed = 0;
  for (let i = 0; i < recipients.length; i += BATCH) {
    const results = await Promise.allSettled(
      recipients.slice(i, i + BATCH).map((recipient) => {
        const email = workshopReminderEmail({
          name: recipient.name,
          workshopTitle: String(workshop.title || "your workshop"),
          hostName: host,
          phrase: reminder.phrase,
          when,
          // The meeting link only goes out once the join window is open.
          joinUrl: reminder.key === "5m" ? String(workshop.meeting_url || "") : undefined,
          logoUrl: branding.emailLogoUrl || branding.logoUrl || undefined,
          buttonColor: branding.themeColor || undefined,
        });
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

/**
 * Sends every workshop reminder that is due right now. Called once a minute (by the backend
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
        if (occurrence.startMs <= now || occurrence.startMs - now > LOOKAHEAD_MS) continue;

        for (const reminder of dueReminders(occurrence.startMs, now)) {
          if (!settingsByCreator.has(creatorId)) {
            settingsByCreator.set(
              creatorId,
              await nocodeDb.creatorEmailSettings.findUnique({ creator_id: creatorId }, SYSTEM_TOKEN).catch(() => null)
            );
          }
          // Unset means on; the creator has to switch it off.
          if (settingsByCreator.get(creatorId)?.[reminder.setting] === false) continue;

          const key = {
            workshop_id: String(workshop.id),
            session_start: new Date(occurrence.startMs).toISOString(),
            reminder: reminder.key,
          };
          // Not filtered on session_start: the backend never matches an ISO time string in a
          // filter, so a lookup on it would always miss and the reminder would be sent twice.
          const previous = await nocodeDb.workshopReminders.findMany(
            { where: { workshop_id: key.workshop_id, reminder: key.reminder } },
            SYSTEM_TOKEN
          );
          if (previous.some((row) => row.session_start === key.session_start)) continue;

          const claim = await nocodeDb.workshopReminders.create({ ...key, sent_count: "0", failed_count: "0" }, SYSTEM_TOKEN);
          result.due++;
          try {
            const { sent, failed } = await sendReminder(workshop, occurrence.startMs, reminder);
            result.sent += sent;
            result.failed += failed;
            await nocodeDb.workshopReminders.update(
              String(claim.id),
              { sent_count: String(sent), failed_count: String(failed) },
              SYSTEM_TOKEN
            );
          } catch (error) {
            console.error(`[workshop-reminders] ${reminder.key} for workshop ${workshop.id} failed:`, error);
          }
        }
      }
    }
  } finally {
    running = false;
  }
  return result;
}
