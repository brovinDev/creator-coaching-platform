import {
  COMMENT_REPLY_PLACEHOLDERS,
  POST_COMMENT_PLACEHOLDERS,
  POST_WORKSHOP_PLACEHOLDERS,
  REMINDER_PLACEHOLDERS,
  toBeefreeMergeTags,
} from "@/lib/email-merge-tags";
import { REMINDERS, type ReminderKey } from "@/lib/workshop-reminder-schedule";

/** Notification emails besides the workshop reminders. Each can be switched off and edited by the creator. */
export const NOTIFICATIONS = [
  {
    key: "after15m",
    label: "Post Workshop Email 15 mins after Workshop",
    description: "Sent to learners of the linked services 15 minutes after each session ends.",
    setting: "notify_after15m_enabled",
  },
  {
    key: "post_comment",
    label: "Notification Email on Post Comment",
    description: "Sent to the author of a post when someone comments on it.",
    setting: "notify_post_comment_enabled",
  },
  {
    key: "comment_reply",
    label: "Notification Email on Comment Reply",
    description: "Sent to the author of a comment when someone replies to it.",
    setting: "notify_comment_reply_enabled",
  },
] as const;

export type NotificationKey = (typeof NOTIFICATIONS)[number]["key"];
export type NotificationSetting = (typeof NOTIFICATIONS)[number]["setting"];

/** Any email a creator can edit and switch off from Email Automation (besides the purchase confirmation). */
export type EmailKind = ReminderKey | NotificationKey;

export const isNotificationKey = (value: string): value is NotificationKey => NOTIFICATIONS.some((n) => n.key === value);
export const isEmailKind = (value: string): value is EmailKind =>
  REMINDERS.some((r) => r.key === value) || isNotificationKey(value);

export interface EmailKindInfo {
  key: EmailKind;
  label: string;
  description: string;
  /** The creator_email_settings column that switches it off. Unset means on. */
  setting: string;
  placeholders: readonly { key: string; label: string }[];
}

/** Every live email in the order Email Automation lists them. */
export const LIVE_EMAILS: EmailKindInfo[] = [
  ...REMINDERS.map((r) => ({
    key: r.key,
    label: r.label,
    description: `Sent to learners of the linked services ${r.phrase.replace("in ", "")} before each session.`,
    setting: r.setting,
    placeholders: REMINDER_PLACEHOLDERS,
  })),
  ...NOTIFICATIONS.map((n) => ({
    key: n.key,
    label: n.label,
    description: n.description,
    setting: n.setting,
    placeholders:
      n.key === "after15m" ? POST_WORKSHOP_PLACEHOLDERS : n.key === "post_comment" ? POST_COMMENT_PLACEHOLDERS : COMMENT_REPLY_PLACEHOLDERS,
  })),
];

export const emailKindInfo = (key: EmailKind): EmailKindInfo => LIVE_EMAILS.find((e) => e.key === key)!;
export const mergeTagsFor = (key: EmailKind) => toBeefreeMergeTags(emailKindInfo(key).placeholders);
