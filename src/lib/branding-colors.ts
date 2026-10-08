/** Pure colour helpers, safe to import from client components. */

export const DEFAULT_PRODUCT_NAME = "service";
export const MAX_PRODUCT_NAME = 20;

export const DEFAULT_THEME_COLOR = "#4f46e5";

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function isValidHexColor(value: string) {
  return HEX_COLOR.test(value);
}

/** Black or white, whichever reads better on the given background colour. */
export function readableTextColor(hex: string) {
  const color = isValidHexColor(hex) ? hex : DEFAULT_THEME_COLOR;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#111827" : "#ffffff";
}

/** Inline style that sets the --brand variable the indigo classes follow. */
export function themeVars(themeColor?: string | null) {
  return (themeColor && isValidHexColor(themeColor) ? { "--brand": themeColor } : {}) as React.CSSProperties;
}

/** Button colours for a creator's theme colour, falling back to the default. */
export function buttonStyle(themeColor?: string | null) {
  const background = themeColor && isValidHexColor(themeColor) ? themeColor : DEFAULT_THEME_COLOR;
  return { backgroundColor: background, color: readableTextColor(background) };
}
