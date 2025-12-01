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
    async jwt({ token, user }) {
      if (user && "id" in user) {
        const typedUser = user as { id: string; plan?: string };
        token.id = typedUser.id;
        token.plan = typedUser.plan ?? "free";
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
