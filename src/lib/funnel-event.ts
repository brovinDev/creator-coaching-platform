import { scheduleOf } from "@/lib/workshops";
import { occurrences } from "@/lib/workshop-time";

type Row = Record<string, unknown>;

/** What a funnel page shows about its event. It always comes from the workshop, never typed twice. */
export interface FunnelEvent {
  /** "YYYY-MM-DDTHH:mm" in the workshop's own timezone; empty when every session is over. */
  eventDate: string;
  timeZone: string;
  duration: string;
}

function localParts(ms: number, tz: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(ms));
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

function zoneLabel(ms: number, tz: string) {
  const name = new Intl.DateTimeFormat("en-IN", { timeZone: tz, timeZoneName: "short" })
    .formatToParts(new Date(ms))
    .find((p) => p.type === "timeZoneName")?.value;
  return name || tz;
}

export function durationLabel(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const parts = [h ? `${h} Hour${h > 1 ? "s" : ""}` : "", m ? `${m} Minutes` : ""].filter(Boolean);
  return parts.join(" ") || "60 Minutes";
}

/** The workshop's next session that has not finished yet (or the last one when all are over). */
export function eventOfWorkshop(workshop: Row, now = Date.now()): FunnelEvent {
  const schedule = scheduleOf(workshop);
  const all = occurrences(schedule);
  const next = all.find((o) => o.endMs > now);
  const duration = durationLabel(schedule.duration_minutes);
  if (!next) return { eventDate: "", timeZone: "", duration };
  return { eventDate: localParts(next.startMs, schedule.timezone), timeZone: zoneLabel(next.startMs, schedule.timezone), duration };
}
