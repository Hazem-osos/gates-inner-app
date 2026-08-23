import type { DefaultSession } from "next-auth";
import type { SupportRole, UserRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      portal: "crm" | "support" | "customer";
      role?: UserRole;
      supportRole?: SupportRole;
      companyName?: string;
    };
  }

  interface User {
    portal?: "crm" | "support" | "customer";
    role?: UserRole;
    supportRole?: SupportRole;
    companyName?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    portal?: "crm" | "support" | "customer";
    role?: UserRole;
    supportRole?: SupportRole;
    companyName?: string;
  }
}
