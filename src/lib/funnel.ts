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
  duration: string;
  language: string;
  headline: string;
  subheadline: string;
  ctaText: string;
  topics: TitledText[];
  outcomes: string[];
  audience: TitledText[];
  hostName: string;
  hostBio: string;
  hostPhoto: string;
  testimonials: Testimonial[];
  bonuses: TitledText[];
  faqs: Faq[];
}

export interface ThanksContent {
  headline: string;
  message: string;
  steps: string[];
  buttonEnabled: boolean;
  buttonText: string;
  buttonUrl: string;
}

export const THEMES = {
  light: { label: "Clean Light", bg: "#ffffff", alt: "#f5f6f8", card: "#ffffff", text: "#111827", muted: "#6b7280", accent: "#4f46e5", onAccent: "#ffffff", border: "#e5e7eb" },
  dark: { label: "Midnight", bg: "#0f172a", alt: "#162033", card: "#1e293b", text: "#f8fafc", muted: "#94a3b8", accent: "#38bdf8", onAccent: "#082f49", border: "#334155" },
  warm: { label: "Sunrise", bg: "#fffaf3", alt: "#fdf1e0", card: "#ffffff", text: "#3b2412", muted: "#7c6a58", accent: "#ea580c", onAccent: "#ffffff", border: "#f3dcc0" },
} as const;
export type ThemeId = keyof typeof THEMES;
export const DEFAULT_THEME: ThemeId = "light";
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
  duration: "60 minutes",
  language: "English",
  headline: "",
  subheadline: "",
  ctaText: "Register Now",
  topics: [{ title: "", text: "" }],
  outcomes: [""],
  audience: [{ title: "", text: "" }],
  hostName: "",
  hostBio: "",
  hostPhoto: "",
  testimonials: [],
  bonuses: [],
  faqs: [{ q: "", a: "" }],
});

export const defaultThanks = (): ThanksContent => ({
  headline: "You're registered!",
  message: "Congratulations! Your seat is confirmed. We have emailed you the details.",
  steps: ["Check your email for the workshop details", "You will get a reminder before we start", "Join on time and bring your questions"],
  buttonEnabled: false,
  buttonText: "Join the WhatsApp Community",
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
    duration: str(o.duration, 40),
    language: str(o.language, 40),
    headline: str(o.headline, LIMITS.headline),
    subheadline: str(o.subheadline, LIMITS.sub),
    ctaText: str(o.ctaText, 40) || "Register Now",
    topics: list(o.topics, LIMITS.topics, titled),
    outcomes: list(o.outcomes, LIMITS.outcomes, (x) => str(x, LIMITS.short)),
    audience: list(o.audience, LIMITS.audience, titled),
    hostName: str(o.hostName, 80),
    hostBio: str(o.hostBio, LIMITS.bio),
    hostPhoto: safeUrl(o.hostPhoto),
    testimonials: list(o.testimonials, LIMITS.testimonials, (x) => {
      const t = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
      return { name: str(t.name, 80), role: str(t.role, 80), quote: str(t.quote, LIMITS.text) };
    }),
    bonuses: list(o.bonuses, LIMITS.bonuses, titled),
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
    steps: list(o.steps, 5, (x) => str(x, LIMITS.short)),
    // A button without a working link would be a dead end, so it only switches on with one.
    buttonEnabled: o.buttonEnabled === true && url !== "",
    buttonText: str(o.buttonText, 40) || "Join the WhatsApp Community",
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

/** Items a visitor would see: blank rows are dropped. */
export const filled = <T extends Record<string, string>>(rows: T[], key: keyof T) => rows.filter((r) => r[key].trim());

/** "Sat, 07 Mar · 11:00 AM", from the date as the creator typed it (no timezone conversion). */
export function eventLabel(eventDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(eventDate);
  if (!m) return "";
  const [, y, mo, d, h, mi] = m.map(Number) as unknown as number[];
  const date = new Date(Date.UTC(y, mo - 1, d));
  const day = date.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", timeZone: "UTC" });
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${day.replace(",", ",")} · ${hour12}:${String(mi).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

/** What the landing page still needs before it can go live. */
export function missingForPublish(c: LandingContent, serviceId: string): string[] {
  const out: string[] = [];
  if (!c.headline.trim()) out.push("a headline");
  if (!c.eventDate) out.push("the event date and time");
  if (!c.topics.some((t) => t.title.trim())) out.push("at least one topic");
  if (!serviceId) out.push("a registration service");
  return out;
}
