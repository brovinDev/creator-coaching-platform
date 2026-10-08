/**
 * The password rule of the nocode backend's sign-up and reset. The web forms used to ask for 6
 * characters only, so a password like "abc12345" passed here and was refused by the backend after
 * the email had already been verified ("Verification failed"). Checking the same rule up front
 * tells people at once. Pure, safe to import from client components.
 */
export const PASSWORD_HINT = "Use at least 8 characters, with a capital letter, a small letter, a number and a symbol.";

/** A sentence saying what is missing, or null when the password is accepted. */
export function passwordProblem(password: string): string | null {
  const ok =
    password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password);
  return ok ? null : PASSWORD_HINT;
}
