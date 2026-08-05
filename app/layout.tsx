import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { OrgProvider } from "@/lib/org/OrgContext";
import { createClient } from "@/lib/supabase/server";
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let orgs: Org[] = [];
  if (user) {
    // RLS on `orgs` scopes rows to the current user's org_members rows.
    const { data, error } = await supabase
      .from("orgs")
      .select("id, name")
      .order("name");

    if (error) {
      throw error;
    }

    orgs = data as Org[];
  }

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
