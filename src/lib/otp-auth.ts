import { randomBytes, randomInt, timingSafeEqual } from "crypto";
import { nocodeDb } from "@/lib/nocode/db";
import { nocodeActivateUser, nocodeUserByEmail, type NocodeUser } from "@/lib/nocode/client";
import { sendEmail, otpEmail } from "@/lib/email";

/**
 * Sign-in with a one-time code emailed to the person. There are no passwords: the code proves the
 * email is theirs. Because the code is the only credential, it expires, is single use, can be
 * guessed only a few times, and a new one cannot be requested in quick succession.
 */

const SYSTEM_TOKEN = process.env.NOCODE_SYSTEM_TOKEN || "";
const CODE_LIFETIME_MS = 10 * 60 * 1000;
const RESEND_AFTER_MS = 30 * 1000;
const MAX_WRONG_GUESSES = 5;

type Row = Record<string, unknown>;

export const normalizeEmail = (email: unknown) => String(email || "").trim().toLowerCase();
export const isEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/** The backend needs a password for every account. Nobody ever sees or uses this one: sign-in is by code. */
export function randomPassword() {
  // Always has the capital, small letter, digit and symbol the backend asks for.
  return `${randomBytes(24).toString("base64url")}aA1!`;
}

const sameCode = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export type IssueResult = { ok: true } | { ok: false; error: string; status: number };

/** Emails a fresh code. `name` is who it is for (shown in the email and used when creating the account). */
export async function issueOtp(input: { email: string; name: string; role: "CREATOR" | "STUDENT" }): Promise<IssueResult> {
  const existing = await nocodeDb.emailOtps.findMany({ where: { email: input.email } }, SYSTEM_TOKEN).catch(() => [] as Row[]);
  const newest = existing.map((r) => Date.parse(String(r.created_at || ""))).filter((n) => !Number.isNaN(n)).sort((a, b) => b - a)[0];
  if (newest && Date.now() - newest < RESEND_AFTER_MS) {
    return { ok: false, error: "Please wait a few seconds before asking for another code.", status: 429 };
  }

  const otp = String(randomInt(100000, 1000000));
  await nocodeDb.emailOtps.deleteWhere({ email: input.email }, SYSTEM_TOKEN).catch(() => {});
  await nocodeDb.emailOtps.create(
    {
      email: input.email,
      otp,
      name: input.name,
      password: "",
      role: input.role,
      verified: false,
      attempts: "0",
      expires_at: new Date(Date.now() + CODE_LIFETIME_MS).toISOString(),
    },
    SYSTEM_TOKEN
  );
  await sendEmail({ to: input.email, ...otpEmail(input.name || "there", otp) });
  return { ok: true };
}

export type CheckResult = { ok: true; record: Row } | { ok: false; error: string };

/**
 * Checks a code. A wrong guess is counted against the code, and after a few it stops working.
 * `consume: true` marks it used, so it cannot be used a second time.
 */
export async function checkOtp(email: string, code: string, opts: { consume: boolean }): Promise<CheckResult> {
  const bad: CheckResult = { ok: false, error: "That code is not right, or it has expired. Ask for a new one." };
  if (!/^\d{6}$/.test(code)) return bad;

  const records = await nocodeDb.emailOtps.findMany({ where: { email } }, SYSTEM_TOKEN);
  const record = records.find((r) => r.verified !== true && r.verified !== "true" && Date.parse(String(r.expires_at)) > Date.now());
  if (!record) return bad;

  const wrong = Number(record.attempts) || 0;
  if (wrong >= MAX_WRONG_GUESSES) return { ok: false, error: "Too many wrong tries. Ask for a new code." };

  if (!sameCode(String(record.otp), code)) {
    await nocodeDb.emailOtps.update(String(record.id), { attempts: String(wrong + 1) }, SYSTEM_TOKEN).catch(() => {});
    return bad;
  }

  if (opts.consume) await nocodeDb.emailOtps.update(String(record.id), { verified: true }, SYSTEM_TOKEN);
  return { ok: true, record };
}

/** The account for an email, or null. An account left inactive is switched on: the code proves the email. */
export async function findActiveUser(email: string): Promise<NocodeUser | null> {
  let user = await nocodeUserByEmail(email, SYSTEM_TOKEN);
  if (user && !user.active) {
    await nocodeActivateUser(email, SYSTEM_TOKEN).catch((e) => console.error("[otp-auth] could not activate", e));
    user = await nocodeUserByEmail(email, SYSTEM_TOKEN);
  }
  return user && user.active ? user : null;
}
