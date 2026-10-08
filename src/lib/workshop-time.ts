/**
 * Workshop scheduling. A workshop stores its first session as a local date + time in an IANA
 * timezone; recurring sessions are expanded on demand and keep that local time across daylight
 * saving. Pure functions, safe to import from client components.
 */

export const JOIN_LEAD_MS = 15 * 60 * 1000;
export const MAX_RECURRING_DAYS = 366;

export const TIMEZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "UTC",
];

export interface WorkshopSchedule {
  start_date: string;
  start_time: string;
  timezone: string;
  duration_minutes: number;
  recurring: boolean;
  recurrence_days: number[];
  recurrence_end: string;
}

export interface Occurrence {
  startMs: number;
  endMs: number;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export const isValidDate = (value: string) => {
  if (!DATE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
};

export const isValidTime = (value: string) => TIME.test(value);

export function isValidTimezone(tz: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function offsetMs(utcMs: number, tz: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

/** The instant (ms since epoch) at which the wall clock in `tz` reads `date` `time`. */
export function zonedToUtc(date: string, time: string, tz: string) {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const first = offsetMs(guess, tz);
  let utc = guess - first;
  const second = offsetMs(utc, tz);
  if (second !== first) utc = guess - second;
  return utc;
}

const addDays = (date: string, days: number) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};

export const weekdayOf = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
};

export function occurrences(s: WorkshopSchedule): Occurrence[] {
  const make = (date: string): Occurrence => {
    const startMs = zonedToUtc(date, s.start_time, s.timezone);
    return { startMs, endMs: startMs + s.duration_minutes * 60000 };
  };
  if (!s.recurring || s.recurrence_days.length === 0) return [make(s.start_date)];

  const out: Occurrence[] = [];
  for (let i = 0; i <= MAX_RECURRING_DAYS; i++) {
    const date = addDays(s.start_date, i);
    if (s.recurrence_end && date > s.recurrence_end) break;
    if (s.recurrence_days.includes(weekdayOf(date))) out.push(make(date));
  }
  return out;
}

export type SessionStatus = "upcoming" | "live" | "completed";

export function sessionStatus(o: Occurrence, now: number): SessionStatus {
  if (now >= o.endMs) return "completed";
  if (now >= o.startMs - JOIN_LEAD_MS) return "live";
  return "upcoming";
}
