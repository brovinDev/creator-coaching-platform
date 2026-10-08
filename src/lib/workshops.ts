import { nocodeDb } from "@/lib/nocode/db";
import { getBranding, isSafeUrl } from "@/lib/branding";
import { idList } from "@/lib/feed";
import {
  JOIN_LEAD_MS,
  isValidDate,
  isValidTime,
  isValidTimezone,
  occurrences,
  sessionStatus,
  weekdayOf,
  zonedToUtc,
  type WorkshopSchedule,
} from "@/lib/workshop-time";

type Row = Record<string, unknown>;

export const MAX_TITLE = 100;
export const MAX_DESCRIPTION = 2000;

export function scheduleOf(w: Row): WorkshopSchedule {
  return {
    start_date: String(w.start_date || ""),
    start_time: String(w.start_time || ""),
    timezone: String(w.timezone || "Asia/Kolkata"),
    duration_minutes: Number(w.duration_minutes) || 60,
    recurring: w.recurring === true || w.recurring === "true",
    recurrence_days: idList(w.recurrence_days).map(Number).filter((n) => n >= 0 && n <= 6),
    recurrence_end: String(w.recurrence_end || ""),
  };
}

/** Linked services required; a learner with any excluded service never gets in. */
export function canLearnerAttend(w: Row, serviceIds: Set<string>) {
  if (idList(w.exclude_service_ids).some((id) => serviceIds.has(id))) return false;
  return idList(w.service_ids).some((id) => serviceIds.has(id));
}

export interface WorkshopInput {
  title: string;
  description: string;
  thumbnail_url: string;
  platform: string;
  meeting_url: string;
  timezone: string;
  start_date: string;
  start_time: string;
  duration_minutes: number;
  recurring: boolean;
  recurrence_days: number[];
  recurrence_end: string;
  service_ids: string[];
  exclude_service_ids: string[];
  upsell_service_id: string;
}

/** Checks a request body. Returns the cleaned workshop or an error message. */
export function parseWorkshopBody(
  body: Record<string, unknown>,
  ownServiceIds: Set<string>,
  opts: { requireFuture: boolean; now?: number }
): WorkshopInput | string {
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const title = str(body.title);
  if (!title) return "Add a title";
  if (title.length > MAX_TITLE) return `Titles can be up to ${MAX_TITLE} characters`;
  const description = str(body.description);
  if (description.length > MAX_DESCRIPTION) return `Descriptions can be up to ${MAX_DESCRIPTION} characters`;

  const thumbnail = str(body.thumbnailUrl);
  if (thumbnail && !isSafeUrl(thumbnail)) return "Invalid thumbnail";
  const meetingUrl = str(body.meetingUrl);
  if (!meetingUrl) return "Add the meeting link learners should join";
  if (!isSafeUrl(meetingUrl)) return "The meeting link must start with http:// or https://";

  const timezone = str(body.timezone) || "Asia/Kolkata";
  if (!isValidTimezone(timezone)) return "Choose a valid timezone";
  const startDate = str(body.startDate);
  const startTime = str(body.startTime);
  if (!isValidDate(startDate)) return "Pick a start date";
  if (!isValidTime(startTime)) return "Pick a start time";

  const duration = Number(body.durationMinutes);
  if (!Number.isInteger(duration) || duration < 15 || duration > 720) {
    return "Duration must be between 15 minutes and 12 hours";
  }

  if (opts.requireFuture && zonedToUtc(startDate, startTime, timezone) <= (opts.now ?? Date.now())) {
    return "The start time must be in the future";
  }

  const recurring = body.recurring === true;
  let days: number[] = [];
  let recurrenceEnd = "";
  if (recurring) {
    days = Array.isArray(body.recurrenceDays)
      ? [...new Set(body.recurrenceDays.map(Number))].filter((n) => Number.isInteger(n) && n >= 0 && n <= 6).sort()
      : [];
    if (days.length === 0) return "Pick at least one day to repeat on";
    if (!days.includes(weekdayOf(startDate))) return "The first session's day must be one of the repeat days";
    recurrenceEnd = str(body.recurrenceEnd);
    if (!isValidDate(recurrenceEnd)) return "Pick when the repeats end";
    if (recurrenceEnd < startDate) return "The repeats must end after the start date";
    const limit = new Date(`${startDate}T00:00:00Z`);
    limit.setUTCDate(limit.getUTCDate() + 366);
    if (recurrenceEnd > limit.toISOString().slice(0, 10)) return "Recurring workshops can run for up to a year";
  }

  const pick = (v: unknown) => (Array.isArray(v) ? v.map(String).filter((id) => ownServiceIds.has(id)) : []);
  const serviceIds = pick(body.serviceIds);
  if (serviceIds.length === 0) return "Link at least one service";
  const excludeIds = pick(body.excludeServiceIds).filter((id) => !serviceIds.includes(id));
  // Any of the creator's own services can be promoted, linked or not.
  const upsell = typeof body.upsellServiceId === "string" && ownServiceIds.has(body.upsellServiceId) ? body.upsellServiceId : "";

  return {
    title,
    description,
    thumbnail_url: thumbnail,
    platform: "custom",
    meeting_url: meetingUrl,
    timezone,
    start_date: startDate,
    start_time: startTime,
    duration_minutes: duration,
    recurring,
    recurrence_days: days,
    recurrence_end: recurrenceEnd,
    service_ids: serviceIds,
    exclude_service_ids: excludeIds,
    upsell_service_id: upsell,
  };
}

export function rowFromInput(input: WorkshopInput): Row {
  return {
    ...input,
    recurrence_days: input.recurrence_days.join(","),
    service_ids: input.service_ids.join(","),
    exclude_service_ids: input.exclude_service_ids.join(","),
  };
}

export interface Session {
  key: string;
  workshopId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  hostName: string;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  recurring: boolean;
  status: "upcoming" | "live" | "completed";
  /** Learners only get the link once the join window opens. */
  joinUrl: string;
  serviceNames?: string[];
}

export async function hostNameFor(creatorId: string, token: string, fallback = "Host") {
  const branding = await getBranding(creatorId, token);
  if (branding.brandName) return branding.brandName;
  const profile = await nocodeDb.userProfiles.findUnique({ user_id: creatorId }, token).catch(() => null);
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");
  return name || fallback;
}

export function sessionsFor(
  w: Row,
  hostName: string,
  opts: { now: number; isCreator: boolean; serviceNames?: Map<string, string> }
): Session[] {
  const schedule = scheduleOf(w);
  return occurrences(schedule).map((o) => {
    const status = sessionStatus(o, opts.now);
    const open = status === "live" || (opts.isCreator && status !== "completed");
    return {
      key: `${w.id}-${o.startMs}`,
      workshopId: String(w.id),
      title: String(w.title || ""),
      description: String(w.description || ""),
      thumbnailUrl: String(w.thumbnail_url || ""),
      hostName,
      startAt: new Date(o.startMs).toISOString(),
      endAt: new Date(o.endMs).toISOString(),
      durationMinutes: schedule.duration_minutes,
      recurring: schedule.recurring,
      status,
      joinUrl: open ? String(w.meeting_url || "") : "",
      ...(opts.serviceNames
        ? { serviceNames: idList(w.service_ids).map((id) => opts.serviceNames!.get(id) || "Deleted service") }
        : {}),
    };
  });
}

export { JOIN_LEAD_MS };
