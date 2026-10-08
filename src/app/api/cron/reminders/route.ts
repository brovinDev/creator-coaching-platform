import { createHash, timingSafeEqual } from "crypto";
import { after, NextRequest, NextResponse } from "next/server";
import { runWorkshopReminders } from "@/lib/workshop-reminders";

const digest = (value: string) => createHash("sha256").update(value).digest();

/**
 * Called every minute by the backend scheduler (see nocode-backend/src/open-slate). Answers at
 * once and sends the due workshop reminders in the background, so a long batch never makes the
 * scheduler's request time out. Protected by the shared CRON_SECRET.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });

  const header = req.headers.get("authorization") || "";
  const given = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!timingSafeEqual(digest(given), digest(secret))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  after(async () => {
    try {
      const result = await runWorkshopReminders();
      if (result.due > 0) console.log("[workshop-reminders]", JSON.stringify(result));
    } catch (error) {
      console.error("[workshop-reminders] run failed", error);
    }
  });
  return NextResponse.json({ queued: true }, { status: 202 });
}
