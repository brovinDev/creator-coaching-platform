import { randomUUID } from "crypto";
import { DEFAULT_THEME_COLOR, isValidHexColor, readableTextColor } from "@/lib/branding-colors";
import { escapeHtml } from "@/lib/email-merge-tags";

/**
 * Builds a default email in the two forms the app needs: HTML to send, and the same email as a
 * Beefree design for the visual designer. Everything that cannot change per recipient (logo,
 * button colour) is baked in; the rest stays as {placeholders} filled in when it is sent.
 */

export interface EmailBrand {
  logoUrl?: string;
  /** #rrggbb theme colour for the button. */
  color?: string;
}

export interface DefaultEmail {
  subject: string;
  html: string;
  /** Plain-text alternative. */
  text: string;
  /** The same email as a Beefree design, for the visual designer. */
  design: Record<string, unknown>;
}

export interface DefaultEmailSpec {
  subject: string;
  heading: string;
  /** Body blocks, in order. `html` may contain placeholders and basic tags. */
  blocks: { html: string; style?: "plain" | "box" | "note" }[];
  button?: { label: string; href: string };
  /** Plain-text version, one entry per paragraph. */
  text: string[];
  brand?: EmailBrand;
}

const FONT = "Arial, Helvetica Neue, Helvetica, sans-serif";

export function buildDefaultEmail(spec: DefaultEmailSpec): DefaultEmail {
  const brand = spec.brand ?? {};
  const color = brand.color && isValidHexColor(brand.color) ? brand.color : DEFAULT_THEME_COLOR;
  const textColor = readableTextColor(color);
  const logo = brand.logoUrl ? escapeHtml(brand.logoUrl) : "";
  const buttonStyle = `display: inline-block; padding: 12px 24px; background-color: ${color}; color: ${textColor}; text-decoration: none; border-radius: 6px;`;
  const button = spec.button
    ? `<a href="${spec.button.href}" target="_blank" rel="noopener" style="${buttonStyle}">${spec.button.label}</a>`
    : "";

  const blockHtml = spec.blocks
    .map((b) =>
      b.style === "box"
        ? `<p style="margin: 20px 0; padding: 14px 16px; background: #f5f5f5; border-radius: 8px;">${b.html}</p>`
        : b.style === "note"
          ? `<p style="color: #666;">${b.html}</p>`
          : `<p>${b.html}</p>`
    )
    .join("\n        ");

  const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        ${logo ? `<img src="${logo}" alt="" style="max-height: 56px; max-width: 200px; margin-bottom: 16px;" />` : ""}
        <h1 style="color: #1a1a1a;">${spec.heading}</h1>
        ${blockHtml}
        ${button ? `<p>${button}</p>` : ""}
      </div>
    `;

  return {
    subject: spec.subject,
    html,
    text: spec.text.join("\n\n"),
    design: designFrom(spec, { logo, button, color }),
  };
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

function designFrom(spec: DefaultEmailSpec, p: { logo: string; button: string; color: string }) {
  const rows = [
    ...(p.logo ? [image(p.logo)] : []),
    paragraph(`<p>${spec.heading}</p>`, { "font-size": "28px", "font-weight": "700", "line-height": "130%", color: "#1a1a1a", "font-family": FONT }),
    ...spec.blocks.map((b) =>
      paragraph(`<p>${b.html}</p>`, b.style === "box" ? { "font-size": "16px" } : b.style === "note" ? { color: "#666666" } : {})
    ),
    ...(p.button ? [paragraph(`<p>${p.button}</p>`)] : []),
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
