/**
 * The webinar funnel: landing page, registration (a service) and thank-you page.
 *
 * The layout is fixed in code. A creator only fills in texts, so a page cannot be broken. Everything
 * saved passes through `cleanContent` / `cleanThanks`, which cap lengths and counts and drop unknown
 * keys, so the stored JSON always has this exact shape.
 */

export interface TitledText {
  title: string;
  text: string;
}
export interface Bonus {
  title: string;
  text: string;
  /** What it is worth, as the creator writes it, e.g. "₹1,999". */
  value: string;
}
export interface Testimonial {
  name: string;
  role: string;
  quote: string;
}
export interface Faq {
  q: string;
  a: string;
}

export interface LandingContent {
  /** "YYYY-MM-DDTHH:mm" in the creator's own time, shown as written. */
  eventDate: string;
  /** Shown after the time, e.g. "IST". */
  timeZone: string;
  duration: string;
  language: string;
  /** Small pill above the headline, e.g. "ATTENTION: Full-Stack Developers!". */
  badge: string;
  headline: string;
  /** Words of the headline shown in the accent gradient. Must appear in the headline. */
  highlight: string;
  subheadline: string;
  ctaText: string;
  closingHeadline: string;
  /** "234 of 500 seats claimed" in the top bar; shown only when both are set. */
  seatsClaimed: string;
  seatsTotal: string;
  topics: TitledText[];
  outcomes: TitledText[];
  audience: TitledText[];
  hostName: string;
  hostTitle: string;
  hostBio: string;
  hostPhoto: string;
  testimonials: Testimonial[];
  bonuses: Bonus[];
  faqs: Faq[];
}

export interface ThanksContent {
  headline: string;
  message: string;
  /** A softer line under the message, above the button. */
  note: string;
  steps: string[];
  buttonEnabled: boolean;
  buttonText: string;
  buttonUrl: string;
}

/** `accent`→`accent2` is the button gradient; `hi1`→`hi2` colours the highlighted headline words. */
export const THEMES = {
  violet: { label: "Midnight Violet", bg: "#030509", alt: "#070a12", card: "#0b0c18", text: "#ffffff", muted: "#a1a1aa", accent: "#8b5cf6", accent2: "#7c3aed", hi1: "#8b5cf6", hi2: "#ec4899", onAccent: "#ffffff", border: "#241f3d", good: "#10b981" },
  light: { label: "Clean Light", bg: "#ffffff", alt: "#f5f6f8", card: "#ffffff", text: "#111827", muted: "#6b7280", accent: "#6366f1", accent2: "#4f46e5", hi1: "#6366f1", hi2: "#ec4899", onAccent: "#ffffff", border: "#e5e7eb", good: "#059669" },
  warm: { label: "Sunrise", bg: "#fffaf3", alt: "#fdf1e0", card: "#ffffff", text: "#3b2412", muted: "#7c6a58", accent: "#f97316", accent2: "#ea580c", hi1: "#f97316", hi2: "#dc2626", onAccent: "#ffffff", border: "#f3dcc0", good: "#059669" },
} as const;
export type ThemeId = keyof typeof THEMES;
export const DEFAULT_THEME: ThemeId = "violet";
export const isTheme = (v: unknown): v is ThemeId => typeof v === "string" && v in THEMES;

export const LIMITS = {
  topics: 7,
  outcomes: 6,
  audience: 4,
  testimonials: 6,
  bonuses: 3,
  faqs: 6,
  short: 120,
  headline: 140,
  sub: 300,
  text: 400,
  bio: 700,
  url: 500,
};

export const emptyContent = (): LandingContent => ({
  eventDate: "",
  timeZone: "IST",
  duration: "60 Minutes",
  language: "English",
  badge: "",
  headline: "",
  highlight: "",
  subheadline: "",
  ctaText: "Register Now - Secure Your Spot",
  closingHeadline: "",
  seatsClaimed: "",
  seatsTotal: "",
  topics: [{ title: "", text: "" }],
  outcomes: [{ title: "", text: "" }],
  audience: [{ title: "", text: "" }],
  hostName: "",
  hostTitle: "",
  hostBio: "",
  hostPhoto: "",
  testimonials: [],
  bonuses: [],
  faqs: [{ q: "", a: "" }],
});

export const defaultThanks = (): ThanksContent => ({
  headline: "Congratulations!",
  message: "You have registered for the workshop!",
  note: "We have emailed you the details.",
  steps: [
    "Check your email for the workshop details",
    "You will receive a reminder email before the workshop",
    "Join on time and bring your questions",
  ],
  buttonEnabled: false,
  buttonText: "Join WhatsApp Group",
  buttonUrl: "",
});

const str = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\r/g, "").slice(0, max) : "");

/** Only http(s) links, so a saved button can never carry a script. */
export function safeUrl(v: unknown): string {
  const s = str(v, LIMITS.url).trim();
  return /^https?:\/\//i.test(s) ? s : "";
}

const list = <T,>(v: unknown, max: number, one: (x: unknown) => T): T[] =>
  Array.isArray(v) ? v.slice(0, max).map(one) : [];

const titled = (x: unknown): TitledText => {
  const o = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
  return { title: str(o.title, LIMITS.short), text: str(o.text, LIMITS.text) };
};

export function cleanContent(input: unknown): LandingContent {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const date = str(o.eventDate, 16);
  return {
    eventDate: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(date) ? date : "",
    timeZone: str(o.timeZone, 12),
    duration: str(o.duration, 40),
    language: str(o.language, 40),
    badge: str(o.badge, 80),
    headline: str(o.headline, LIMITS.headline),
    highlight: str(o.highlight, LIMITS.headline),
    subheadline: str(o.subheadline, LIMITS.sub),
    ctaText: str(o.ctaText, 50) || "Register Now",
    closingHeadline: str(o.closingHeadline, LIMITS.headline),
    seatsClaimed: str(o.seatsClaimed, 6).replace(/\D/g, ""),
    seatsTotal: str(o.seatsTotal, 6).replace(/\D/g, ""),
    topics: list(o.topics, LIMITS.topics, titled),
    outcomes: list(o.outcomes, LIMITS.outcomes, titled),
    audience: list(o.audience, LIMITS.audience, titled),
    hostName: str(o.hostName, 80),
    hostTitle: str(o.hostTitle, 80),
    hostBio: str(o.hostBio, LIMITS.bio),
    hostPhoto: safeUrl(o.hostPhoto),
    testimonials: list(o.testimonials, LIMITS.testimonials, (x) => {
      const t = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
      return { name: str(t.name, 80), role: str(t.role, 80), quote: str(t.quote, LIMITS.text) };
    }),
    bonuses: list(o.bonuses, LIMITS.bonuses, (x) => ({
      ...titled(x),
      value: str((x as Record<string, unknown> | null)?.value, 20),
    })),
    faqs: list(o.faqs, LIMITS.faqs, (x) => {
      const f = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
      return { q: str(f.q, LIMITS.short), a: str(f.a, LIMITS.text) };
    }),
  };
}

export function cleanThanks(input: unknown): ThanksContent {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const url = safeUrl(o.buttonUrl);
  return {
    headline: str(o.headline, LIMITS.headline),
    message: str(o.message, LIMITS.text),
    note: str(o.note, LIMITS.text),
    steps: list(o.steps, 5, (x) => str(x, LIMITS.short)),
    // A button without a working link would be a dead end, so it only switches on with one.
    buttonEnabled: o.buttonEnabled === true && url !== "",
    buttonText: str(o.buttonText, 40) || "Join WhatsApp Group",
    buttonUrl: url,
  };
}

export function parseJson<T>(raw: unknown, clean: (v: unknown) => T): T {
  if (typeof raw === "string") {
    try {
      return clean(JSON.parse(raw));
    } catch {
      /* fall through */
    }
  } else if (raw && typeof raw === "object") {
    return clean(raw);
  }
  return clean({});
}

/** The date and time as the creator typed them (no timezone conversion): "Sat, 07 Mar" and "11:00 AM". */
export function eventParts(eventDate: string): { date: string; time: string } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(eventDate);
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const date = new Date(Date.UTC(y, mo - 1, d)).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", timeZone: "UTC" });
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return { date: date.replace(/^(\w+) /, "$1, "), time: `${hour12}:${String(mi).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}` };
}

/** Splits a headline around the words to highlight; no match means no highlight. */
export function splitHeadline(headline: string, highlight: string): [string, string, string] {
  const h = highlight.trim();
  const i = h ? headline.indexOf(h) : -1;
  return i < 0 ? [headline, "", ""] : [headline.slice(0, i), h, headline.slice(i + h.length)];
}

/** What the landing page still needs before it can go live. */
export function missingForPublish(c: LandingContent, serviceId: string, workshopId: string): string[] {
  const out: string[] = [];
  if (!c.headline.trim()) out.push("a headline");
  if (!workshopId) out.push("the workshop");
  if (!c.topics.some((t) => t.title.trim())) out.push("at least one topic");
  if (!serviceId) out.push("a registration service");
  return out;
}
