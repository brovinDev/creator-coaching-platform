import { randomBytes, randomInt } from "crypto";
import { nocodeDb } from "@/lib/nocode/db";
import { sendEmail, otpEmail } from "@/lib/email";

const SYSTEM_TOKEN = process.env.NOCODE_SYSTEM_TOKEN || "";

// Marks an email_otps row as a sign-in code (signup/checkout rows carry their own role).
export const LOGIN_OTP_ROLE = "LOGIN";

const OTP_TTL_MS = 10 * 60 * 1000;

export function generateOtp(): string {
  return randomInt(100000, 1000000).toString();
}

/**
 * Users never type a password (sign-in is by emailed code), but the nocode backend still
 * requires one to create an account. Give it a random one that satisfies its complexity rules.
 */
export function generateInternalPassword(): string {
  return `${randomBytes(18).toString("base64url")}aA1!`;
}

export async function findProfileByEmail(email: string) {
  return nocodeDb.userProfiles.findFirst({ email }, SYSTEM_TOKEN).catch(() => null);
}

/** Stores a sign-in code for `email`, replacing any earlier code for that address. */
export async function storeLoginOtp(email: string, otp: string) {
  await nocodeDb.emailOtps.deleteWhere({ email }, SYSTEM_TOKEN).catch(() => {});
  await nocodeDb.emailOtps.create(
    {
      email,
      otp,
      name: "",
      password: "",
      role: LOGIN_OTP_ROLE,
      verified: false,
      expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
    },
    SYSTEM_TOKEN
  );
}

/**
 * Emails a sign-in code to an existing account.
 * Returns false when no account has this email.
 */
export async function sendLoginOtp(email: string): Promise<boolean> {
  const profile = await findProfileByEmail(email);
  if (!profile) return false;

  const otp = generateOtp();
  await storeLoginOtp(email, otp);

  const name = (profile.first_name as string) || "there";
  await sendEmail({ to: email, ...otpEmail(name, otp) });
  return true;
}

/** Checks a sign-in code and, if valid, uses it up. */
export async function consumeLoginOtp(email: string, otp: string): Promise<boolean> {
  const records = await nocodeDb.emailOtps.findMany(
    { where: { email, otp, verified: false } },
    SYSTEM_TOKEN
  );
  const record = records.find(
    (r) =>
      r.role === LOGIN_OTP_ROLE &&
      r.expires_at &&
      new Date(r.expires_at as string) > new Date()
  );
  if (!record) return false;

  await nocodeDb.emailOtps.update(String(record.id), { verified: true }, SYSTEM_TOKEN);
  return true;
}
