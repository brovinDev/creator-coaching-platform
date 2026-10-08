import { NextRequest, NextResponse } from "next/server";
import { auth, getNocodeToken } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";
import { isEmailKind } from "@/lib/email-notifications";

// Beefree credentials must stay server-side, so the browser asks us for a token.
// The token's uid must match the uid the builder is started with, so it is returned too.
// Editing a service's email uses the service id; the default email uses the creator id.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "CREATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { serviceId, reminder } = await req.json().catch(() => ({}));
  let uid = session.user.id;
  if (reminder) {
    if (!isEmailKind(String(reminder))) {
      return NextResponse.json({ error: "Unknown email" }, { status: 404 });
    }
    uid = `${session.user.id}-reminder-${reminder}`;
  }
  if (serviceId && !reminder) {
    const service = await nocodeDb.services.findUnique({ id: String(serviceId) }, await getNocodeToken());
    if (!service || service.creator_id !== session.user.id) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }
    uid = String(serviceId);
  }

  const clientId = process.env.BEEFREE_CLIENT_ID;
  const clientSecret = process.env.BEEFREE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Email builder is not configured (BEEFREE_CLIENT_ID / BEEFREE_CLIENT_SECRET)" },
      { status: 503 }
    );
  }

  try {
    const res = await fetch("https://auth.getbee.io/loginV2", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, uid }),
    });
    if (!res.ok) {
      console.error("[email-builder] Beefree auth failed:", res.status, await res.text().catch(() => ""));
      return NextResponse.json({ error: "Could not authorize the email builder" }, { status: 502 });
    }
    return NextResponse.json({ ...(await res.json()), uid });
  } catch (error) {
    console.error("[email-builder] Beefree auth error:", error);
    return NextResponse.json({ error: "Could not reach the email builder service" }, { status: 502 });
  }
}
