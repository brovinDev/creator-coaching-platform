import { randomUUID } from "crypto";
import { DEFAULT_THEME_COLOR, isValidHexColor, readableTextColor } from "@/lib/branding-colors";
import { escapeHtml } from "@/lib/email-merge-tags";
import type { ReminderKey } from "@/lib/workshop-reminder-schedule";

/**
 * The reminder email learners get until a creator writes their own, and the design the editor
 * opens on. One source for both, so what a creator edits is exactly what is being sent.
 *
 * Everything creator-specific that cannot change per learner (logo, button colour) is baked in;
 * the rest stays as placeholders ({workshop.title} ...) and is filled in when it is sent.
 */

export interface ReminderBrand {
  logoUrl?: string;
  /** #rrggbb theme colour for the button. */
  color?: string;
}

export interface DefaultReminderEmail {
  subject: string;
  html: string;
  /** Plain-text alternative. */
  text: string;
  /** The same email as a Beefree design, for the visual designer. */
  design: Record<string, unknown>;
}

const SUBJECT = "Reminder: {workshop.title} starts {workshop.starts_in}";
const FONT = "Arial, Helvetica Neue, Helvetica, sans-serif";

/** Only the meeting itself (5 minute reminder) says "Join"; the earlier ones point at the workshops page. */
export function defaultReminderEmail(key: ReminderKey, brand: ReminderBrand = {}): DefaultReminderEmail {
  const color = brand.color && isValidHexColor(brand.color) ? brand.color : DEFAULT_THEME_COLOR;
  const textColor = readableTextColor(color);
  const joinNow = key === "5m";
  const label = joinNow ? "Join workshop" : "View my workshops";
  const note = joinNow ? "" : "The join button appears on your workshops page 15 minutes before the start.";

  const heading = "Starting {workshop.starts_in}";
  const intro = "Hi {contact.firstname}, your workshop <strong>{workshop.title}</strong> with {workshop.host} starts {workshop.starts_in}.";
  const when = "<strong>{workshop.date}, {workshop.time}</strong>";
  const buttonStyle = `display: inline-block; padding: 12px 24px; background-color: ${color}; color: ${textColor}; text-decoration: none; border-radius: 6px;`;
  const button = `<a href="{workshop.link}" target="_blank" rel="noopener" style="${buttonStyle}">${label}</a>`;
  const logo = brand.logoUrl ? escapeHtml(brand.logoUrl) : "";

  const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        ${logo ? `<img src="${logo}" alt="" style="max-height: 56px; max-width: 200px; margin-bottom: 16px;" />` : ""}
        <h1 style="color: #1a1a1a;">${heading}</h1>
        <p>${intro}</p>
        <p style="margin: 20px 0; padding: 14px 16px; background: #f5f5f5; border-radius: 8px;">${when}</p>
        ${note ? `<p style="color: #666;">${note}</p>` : ""}
        <p>${button}</p>
      </div>
    `;

  const text = [
    "Hi {contact.firstname}, your workshop \"{workshop.title}\" with {workshop.host} starts {workshop.starts_in}.",
    "{workshop.date}, {workshop.time}",
    ...(note ? [note] : []),
    `${label}: {workshop.link}`,
  ].join("\n\n");

  return { subject: SUBJECT, html, text, design: reminderDesign({ heading, intro, when, note, button, logo, color }) };
}

/* ---- Beefree design (same JSON the builder itself produces for these modules) ---- */

const padding = (v: string) => ({ "padding-top": v, "padding-right": v, "padding-bottom": v, "padding-left": v });

function row(module: Record<string, unknown>) {
  return {
    columns: [
      {
        "grid-columns": 12,
        modules: [{ ...module, locked: false, uuid: randomUUID() }],
        style: {
          "background-color": "transparent",
          "border-bottom": "0 solid transparent",
          "border-left": "0 solid transparent",
          "border-right": "0 solid transparent",
          "border-top": "0 solid transparent",
          "padding-bottom": "5px",
          "padding-left": "0px",
          "padding-right": "0px",
          "padding-top": "5px",
        },
        uuid: randomUUID(),
      },
    ],
    container: {
      style: { "background-color": "transparent", "background-image": "none", "background-position": "top left", "background-repeat": "no-repeat" },
    },
    content: {
      computedStyle: { hideContentOnDesktop: false, hideContentOnMobile: false, rowColStackOnMobile: true, rowReverseColStackOnMobile: false, verticalAlign: "top" },
      style: { "background-color": "transparent", "background-image": "none", "background-position": "top left", "background-repeat": "no-repeat", color: "#000000", width: "500px" },
    },
    empty: false,
    locked: false,
    synced: false,
    type: "one-column-empty",
    uuid: randomUUID(),
  };
}

function paragraph(html: string, style: Record<string, string> = {}) {
  return row({
    type: "mailup-bee-newsletter-modules-paragraph",
    descriptor: {
      computedStyle: { hideContentOnAmp: false, hideContentOnDesktop: false, hideContentOnHtml: false, hideContentOnMobile: false },
      paragraph: {
        computedStyle: { linkColor: "#0068A5", paragraphSpacing: "16px" },
        html,
        style: {
          color: "#000000",
          direction: "ltr",
          "font-family": "inherit",
          "font-size": "14px",
          "font-weight": "400",
          "letter-spacing": "0px",
          "line-height": "120%",
          "text-align": "left",
          ...style,
        },
      },
      style: padding("10px"),
    },
  });
}

function image(src: string) {
  return row({
    type: "mailup-bee-newsletter-modules-image",
    descriptor: {
      computedStyle: { class: "left fixedwidth", hideContentOnAmp: false, hideContentOnDesktop: false, hideContentOnHtml: false, hideContentOnMobile: false, width: 140 },
      image: { alt: "", height: "auto", href: "", src, target: "_self", width: "140px" },
      style: { ...padding("10px"), width: "100%" },
    },
  });
}

function reminderDesign(p: { heading: string; intro: string; when: string; note: string; button: string; logo: string; color: string }) {
  const rows = [
    ...(p.logo ? [image(p.logo)] : []),
    paragraph(`<p>${p.heading}</p>`, { "font-size": "28px", "font-weight": "700", "line-height": "130%", color: "#1a1a1a", "font-family": FONT }),
    paragraph(`<p>${p.intro}</p>`),
    paragraph(`<p>${p.when}</p>`, { "font-size": "16px" }),
    ...(p.note ? [paragraph(`<p>${p.note}</p>`, { color: "#666666" })] : []),
    paragraph(`<p>${p.button}</p>`),
  ];
  return {
    page: {
      body: {
        container: { style: { "background-color": "#FFFFFF" } },
        content: {
          computedStyle: { align: "center", linkColor: p.color, messageBackgroundColor: "transparent", messageWidth: "500px" },
          style: { color: "#000000", "font-family": FONT },
        },
        webFonts: [],
      },
      description: "",
      rows,
      template: { version: "2.0.0" },
      title: "",
    },
    comments: {},
  };
}
