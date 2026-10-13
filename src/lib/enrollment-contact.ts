type Row = Record<string, unknown>;

const text = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));

/** A phone number out of the checkout form answers, if the learner gave one. */
export function phoneFrom(enrollment: Row): string {
  const raw = enrollment.custom_fields;
  if (typeof raw !== "string" || !raw) return "";
  try {
    const answers = JSON.parse(raw) as Record<string, unknown>;
    for (const [key, value] of Object.entries(answers)) {
      const v = text(value).trim();
      if (/phone|mobile|whatsapp|contact/i.test(key) && /^[+\d][\d\s()-]{6,}$/.test(v)) return v;
    }
    for (const value of Object.values(answers)) {
      const v = text(value).trim();
      if (/^\+?\d[\d\s()-]{8,}$/.test(v)) return v;
    }
  } catch {
    // Not JSON: no phone to show.
  }
  return "";
}
