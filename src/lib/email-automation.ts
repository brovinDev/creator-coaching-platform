import { auth } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";

/** The signed-in creator, or an error shaped for NextResponse.json. */
export async function requireCreator() {
  const session = await auth();
  if (!session?.user || session.user.role !== "CREATOR") {
    return { error: "Unauthorized", status: 401 } as const;
  }
  return { user: session.user } as const;
}

/** The service, only if the signed-in creator owns it. */
export async function getOwnedService(serviceId: string, token: string) {
  const creator = await requireCreator();
  if ("error" in creator) return { error: creator.error, status: creator.status } as const;

  const service = await nocodeDb.services.findUnique({ id: serviceId }, token);
  if (!service || service.creator_id !== creator.user.id) {
    return { error: "Service not found", status: 404 } as const;
  }
  return { service, user: creator.user } as const;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string) {
  return value.length <= 254 && EMAIL_PATTERN.test(value);
}

/** Template columns from a request body. `prefix` is "" for a service row, "default_" on the creator settings row. */
export function templateFieldsFromBody(body: Record<string, unknown>, prefix: "" | "default_") {
  const data: Record<string, unknown> = {};
  if (typeof body.subject === "string") data[`${prefix}subject`] = body.subject.slice(0, 200);
  if (typeof body.body_text === "string") data[`${prefix}body_text`] = body.body_text.slice(0, 20000);
  if (typeof body.design_json === "string") data[`${prefix}design_json`] = body.design_json;
  if (typeof body.html === "string") data[`${prefix}html`] = body.html;
  if (body.format === "text" || body.format === "html") data[`${prefix}format`] = body.format;
  return data;
}

/** What an editor needs to show a stored template. */
export function templateForEditor(row: Record<string, unknown> | null | undefined, prefix: "" | "default_") {
  const html = String(row?.[`${prefix}html`] || "");
  const stored = row?.[`${prefix}format`];
  return {
    subject: String(row?.[`${prefix}subject`] || ""),
    // Designs saved before the simple editor existed have no format; they are HTML.
    format: stored === "text" || stored === "html" ? stored : html ? "html" : "text",
    body_text: String(row?.[`${prefix}body_text`] || ""),
    design_json: (row?.[`${prefix}design_json`] as string) || null,
  };
}
