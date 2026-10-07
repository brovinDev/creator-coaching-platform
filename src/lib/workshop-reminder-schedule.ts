/** When each workshop reminder goes out. Pure, so the timing rules can be tested on their own. */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

export interface ReminderKind {
  key: "24h" | "1h" | "5m";
  /** How long before the start it goes out. */
  beforeMs: number;
  /** "in 24 hours" - used in the subject and body. */
  phrase: string;
  /** The creator_email_settings column that switches it off. Unset means on. */
  setting: "reminder_24h_enabled" | "reminder_1h_enabled" | "reminder_5m_enabled";
  /** Shown to the creator in Email Automation. */
  label: string;
}

export type ReminderKey = ReminderKind["key"];

export const REMINDERS: ReminderKind[] = [
  { key: "24h", beforeMs: 24 * HOUR, phrase: "in 24 hours", setting: "reminder_24h_enabled", label: "Reminder Email 24 hours before Workshop" },
  { key: "1h", beforeMs: HOUR, phrase: "in 1 hour", setting: "reminder_1h_enabled", label: "Reminder Email 1 hour before Workshop" },
  { key: "5m", beforeMs: 5 * MINUTE, phrase: "in 5 minutes", setting: "reminder_5m_enabled", label: "Reminder Email 5 mins before Workshop" },
];

/**
 * How late a reminder may still go out if a tick was missed. Short on purpose: a reminder that
 * arrives long after its moment is wrong ("in 24 hours" when it is really 2 hours away), and
 * a workshop created less than a day ahead must not fire its 24 hour reminder straight away.
 * Never longer than the reminder itself, so a 5 minute reminder is never sent after the start.
 */
export const MAX_LATE_MS = 10 * MINUTE;

/** The reminders whose moment has come for a session starting at `startMs`. */
export function dueReminders(startMs: number, now: number): ReminderKind[] {
  if (now >= startMs) return [];
  return REMINDERS.filter((r) => {
    const opens = startMs - r.beforeMs;
    return now >= opens && now < opens + Math.min(r.beforeMs, MAX_LATE_MS);
  });
}

/** The post workshop email goes out this long after a session ends. */
export const AFTER_SESSION_MS = 15 * MINUTE;

/** Whether the post workshop email is due for a session that ended at `endMs`. Same lateness limit as the reminders. */
export function postWorkshopDue(endMs: number, now: number): boolean {
  const opens = endMs + AFTER_SESSION_MS;
  return now >= opens && now < opens + MAX_LATE_MS;
}

export const isReminderKey = (value: string): value is ReminderKey => REMINDERS.some((r) => r.key === value);

/** What the editor starts from when a creator has not written their own yet. */
export const REMINDER_STARTER_SUBJECT = "Reminder: {workshop.title} starts {workshop.starts_in}";
export const REMINDER_STARTER_BODY = `Hi {contact.firstname},

{workshop.title} with {workshop.host} starts {workshop.starts_in}.

When: {workshop.date}, {workshop.time}
Join: {workshop.link}

See you there!`;
