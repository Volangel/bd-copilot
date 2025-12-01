import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      plan: string;
    };
  }

  interface User {
    id: string;
    plan: string;
    email: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    plan?: string;
  }
}
