import { NextRequest, NextResponse } from "next/server";
import { auth, getNocodeToken } from "@/lib/auth";
import { nocodeDb } from "@/lib/nocode/db";

/**
 * Saves what the sign-up form asked besides name and email: the phone number, and what the person
 * agreed to. Called right after the code is verified, when there is a signed-in account to attach it to.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const phone = String(body.phone || "").replace(/\D/g, "");
  const countryCode = String(body.countryCode || "").replace(/[^\d+]/g, "").slice(0, 6);
  if (phone && (phone.length < 6 || phone.length > 15)) {
    return NextResponse.json({ error: "Enter a valid phone number" }, { status: 400 });
  }

  const token = await getNocodeToken();
  const profile = await nocodeDb.userProfiles.findUnique({ user_id: session.user.id }, token);
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  await nocodeDb.userProfiles.update(
    String(profile.id),
    {
      phone,
      country_code: countryCode,
      marketing_opt_in: body.marketingOptIn ? "true" : "false",
      terms_accepted_at: body.termsAccepted ? new Date().toISOString() : "",
    },
    token
  );

  return NextResponse.json({ ok: true });
}
