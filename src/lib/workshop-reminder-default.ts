import type { ReminderKey } from "@/lib/workshop-reminder-schedule";
import { buildDefaultEmail, type DefaultEmail, type EmailBrand } from "@/lib/default-email";

/**
 * The reminder email learners get until a creator writes their own, and the design the editor
 * opens on. One source for both, so what a creator edits is exactly what is being sent.
 */

export type ReminderBrand = EmailBrand;
export type DefaultReminderEmail = DefaultEmail;

/** Only the meeting itself (5 minute reminder) says "Join"; the earlier ones point at the workshops page. */
export function defaultReminderEmail(key: ReminderKey, brand: ReminderBrand = {}): DefaultReminderEmail {
  const joinNow = key === "5m";
  const label = joinNow ? "Join workshop" : "View my workshops";
  const note = joinNow ? "" : "The join button appears on your workshops page 15 minutes before the start.";

  return buildDefaultEmail({
    subject: "Reminder: {workshop.title} starts {workshop.starts_in}",
    heading: "Starting {workshop.starts_in}",
    blocks: [
      { html: "Hi {contact.firstname}, your workshop <strong>{workshop.title}</strong> with {workshop.host} starts {workshop.starts_in}." },
      { html: "<strong>{workshop.date}, {workshop.time}</strong>", style: "box" },
      ...(note ? [{ html: note, style: "note" as const }] : []),
    ],
    button: { label, href: "{workshop.link}" },
    text: [
      "Hi {contact.firstname}, your workshop \"{workshop.title}\" with {workshop.host} starts {workshop.starts_in}.",
      "{workshop.date}, {workshop.time}",
      ...(note ? [note] : []),
      `${label}: {workshop.link}`,
    ],
    brand,
  });
}
