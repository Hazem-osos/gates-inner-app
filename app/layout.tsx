import type { Metadata } from "next";
import { Cairo, Geist_Mono } from "next/font/google";

import { AuthSessionProvider } from "@/components/providers/session-provider";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "نظام CRM",
  description: "إدارة العملاء والمتابعات",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <AuthSessionProvider>
          {children}
          <Toaster richColors position="top-center" dir="rtl" />
        </AuthSessionProvider>
      </body>
    </html>
  );
}
