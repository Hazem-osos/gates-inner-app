import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret:
    process.env.AUTH_SECRET ??
    (process.env.NODE_ENV === "production"
      ? undefined
      : "dev-only-insecure-auth-secret"),
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      id: "crm-credentials",
      name: "crm-credentials",
      credentials: {
        email: { label: "البريد", type: "email" },
        password: { label: "كلمة المرور", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        if (
          !user?.isActive ||
          !user.passwordHash ||
          user.deletedAt
        ) {
          return null;
        }
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          portal: "crm" as const,
        };
      },
    }),
    Credentials({
      id: "support-credentials",
      name: "support-credentials",
      credentials: {
        email: { label: "البريد", type: "email" },
        password: { label: "كلمة المرور", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;
        const user = await prisma.supportUser.findUnique({ where: { email } });
        if (!user?.isActive || !user.passwordHash) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          supportRole: user.role,
          portal: "support" as const,
        };
      },
    }),
    Credentials({
      id: "customer-credentials",
      name: "customer-credentials",
      credentials: {
        email: { label: "البريد", type: "email" },
        password: { label: "كلمة المرور", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;
        const customer = await prisma.customer.findUnique({ where: { email } });
        if (!customer?.isActive || !customer.passwordHash) return null;
        const ok = await bcrypt.compare(password, customer.passwordHash);
        if (!ok) return null;
        return {
          id: customer.id,
          email: customer.email,
          name: customer.contactName,
          companyName: customer.companyName,
          portal: "customer" as const,
        };
      },
    }),
    Credentials({
      id: "credentials",
      name: "credentials",
      credentials: {
        email: { label: "البريد", type: "email" },
        password: { label: "كلمة المرور", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        if (
          !user?.isActive ||
          !user.passwordHash ||
          user.deletedAt
        ) {
          return null;
        }
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          portal: "crm" as const,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        const u = user as {
          role?: string;
          portal?: string;
          supportRole?: string;
          companyName?: string;
        };
        if (u.portal) token.portal = u.portal;
        if (u.role) token.role = u.role;
        if (u.supportRole) token.supportRole = u.supportRole;
        if (u.companyName) token.companyName = u.companyName;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        const portal = token.portal as string | undefined;
        if (portal === "support") {
          (session.user as { portal: string }).portal = "support";
          (session.user as { supportRole: string }).supportRole =
            token.supportRole as string;
        } else if (portal === "customer") {
          (session.user as { portal: string }).portal = "customer";
          (session.user as { companyName: string }).companyName =
            (token.companyName as string) ?? "";
        } else {
          (session.user as { portal: string }).portal = "crm";
          (session.user as { role: string }).role = token.role as string;
        }
      }
      return session;
    },
  },
});
