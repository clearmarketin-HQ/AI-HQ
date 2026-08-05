import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { OrgProvider } from "@/lib/org/OrgContext";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { Org } from "@/lib/org/types";
import "./globals.css";

export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI HQ",
  description: "AI HQ",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("orgs")
    .select("id, name")
    .order("name");

  if (error) {
    throw error;
  }

  const orgs = data as Org[];

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <OrgProvider orgs={orgs}>{children}</OrgProvider>
      </body>
    </html>
  );
}
