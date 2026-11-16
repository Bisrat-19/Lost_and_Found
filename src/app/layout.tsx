import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toast } from "@heroui/react";
import { NavBar } from "@/components/layout/NavBar";
import { LiveFeedProvider } from "@/context/LiveFeedContext";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lost & Found Matcher",
  description: "Report lost and found items on campus and see likely matches.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="bg-background text-foreground flex min-h-full flex-col font-sans">
        {/* App-wide live store (public SSE stream): new / returned found items */}
        <LiveFeedProvider>
          <NavBar />
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
        </LiveFeedProvider>
        <Toast.Provider placement="bottom end" />
      </body>
    </html>
  );
}
