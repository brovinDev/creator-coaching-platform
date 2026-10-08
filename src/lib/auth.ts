import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { nocodeSignin } from "./nocode/client";
import { nocodeDb } from "./nocode/db";
import { syncProfileContact } from "./profile-contact";
import { consumeLoginOtp, findProfileByEmail } from "./otp-auth";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const res = await nocodeSignin(
            credentials.email as string,
            credentials.password as string
          );

          if (!res.success || !res.data) return null;

          const user = res.data;
          const name = [user.first_name, user.last_name].filter(Boolean).join(" ");

          const systemToken = process.env.NOCODE_SYSTEM_TOKEN || "";
          const profile = await nocodeDb.userProfiles
            .findUnique({ user_id: user.id }, systemToken)
            .catch(() => null);

          await syncProfileContact(profile, user);

          return {
            id: user.id,
            name,
            email: user.email,
            image: (profile?.avatar as string) || null,
            role: (profile?.role as string) || "STUDENT",
            nocodeToken: user.jwt,
          };
        } catch {
          return null;
        }
      },
    }),
    // Passwordless sign-in: the user proves they own the email with a code we emailed them.
    Credentials({
      id: "otp",
      name: "otp",
      credentials: {
        email: { label: "Email", type: "email" },
        otp: { label: "Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.otp) return null;

        try {
          const email = credentials.email as string;
          if (!(await consumeLoginOtp(email, credentials.otp as string))) return null;

          const profile = await findProfileByEmail(email);
          if (!profile) return null;

          const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ");

          return {
            id: profile.user_id as string,
            name,
            email,
            image: (profile.avatar as string) || null,
            role: (profile.role as string) || "STUDENT",
            nocodeToken: "",
          };
        } catch {
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
        token.nocodeToken = (user as { nocodeToken: string }).nocodeToken;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        (session as { nocodeToken?: string }).nocodeToken = token.nocodeToken as string;
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
