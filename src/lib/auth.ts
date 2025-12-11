import { prisma } from "@/lib/prisma";
import { compare } from "bcrypt";
import { NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;

        if (!email || !password) {
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          return null;
        }

        const passwordValid = await compare(password, user.passwordHash);
        if (!passwordValid) {
          return null;
        }

        const safeUser = {
          id: user.id,
          email: user.email,
          plan: user.plan,
        };

        return safeUser;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user && "id" in user) {
        const typedUser = user as { id: string; plan?: string };
        token.id = typedUser.id;
        token.plan = typedUser.plan ?? "free";
        token.planCheckedAt = Date.now();
      }

      // Refresh plan from database periodically (every 5 minutes) or on update trigger
      // This ensures plan changes from Stripe webhooks are reflected without requiring re-login
      const PLAN_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
      const lastChecked = (token.planCheckedAt as number) || 0;
      const shouldRefresh = trigger === "update" || (Date.now() - lastChecked > PLAN_REFRESH_INTERVAL);

      if (shouldRefresh && token.id && !user) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { plan: true },
          });
          if (dbUser) {
            token.plan = dbUser.plan ?? "free";
            token.planCheckedAt = Date.now();
          }
        } catch (err) {
          console.error("[auth] Failed to refresh plan from database", err);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.plan = (token.plan as string) ?? "free";
      }
      return session;
    },
  },
};

export function getServerAuthSession() {
  return getServerSession(authOptions);
}
