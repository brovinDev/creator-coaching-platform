import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { nocodeDb } from "./nocode/db";
import { syncProfileContact } from "./profile-contact";
import { checkOtp, findActiveUser, normalizeEmail } from "./otp-auth";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    // Sign-in is by a one-time code emailed to the person; there are no passwords.
    Credentials({
      name: "email code",
      credentials: {
        email: { label: "Email", type: "email" },
        otp: { label: "Code", type: "text" },
      },
      async authorize(credentials) {
        const email = normalizeEmail(credentials?.email);
        const code = String(credentials?.otp || "").trim();
        if (!email || !code) return null;

        try {
          // The code is used up here, so it cannot sign anyone in a second time.
          const checked = await checkOtp(email, code, { consume: true });
          if (!checked.ok) return null;

          const user = await findActiveUser(email);
          if (!user) return null;

          const name = [user.firstName, user.lastName].filter(Boolean).join(" ").replace(/\s\.$/, "");
          const systemToken = process.env.NOCODE_SYSTEM_TOKEN || "";
          const profile = await nocodeDb.userProfiles
            .findUnique({ user_id: user.id }, systemToken)
            .catch(() => null);

          await syncProfileContact(profile, { email: user.email, first_name: user.firstName, last_name: user.lastName });

          return {
            id: user.id,
            name,
            email: user.email,
            image: (profile?.avatar as string) || null,
            role: (profile?.role as string) || "STUDENT",
          };
        } catch (error) {
          console.error("[auth] sign-in failed", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});

export async function getNocodeToken(): Promise<string> {
  return process.env.NOCODE_SYSTEM_TOKEN || "";
}
