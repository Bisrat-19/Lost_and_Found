import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import { Toast } from "@heroui/react";
import { NavBar } from "@/components/layout/NavBar";
import { LiveFeedProvider } from "@/context/LiveFeedContext";
import "./globals.css";

// One family, two personalities: expanded + heavy for headlines, normal width for text.
const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], axes: ["wdth"] });

export const metadata: Metadata = {
  title: "Lost & Found Matcher",
  description: "Report lost and found items on campus and see likely matches.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} h-full antialiased`}>
      <body className="bg-background text-foreground flex min-h-full flex-col font-sans">
        {/* App-wide live store (public SSE stream): new / returned found items */}
        <LiveFeedProvider>
          <NavBar />
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:py-14">{children}</main>
        </LiveFeedProvider>
        <footer className="text-muted mx-auto w-full max-w-5xl px-4 pb-8 text-sm">
          Matches are suggestions. Always check a detail only the owner would know before handing
          an item over.
        </footer>
        <Toast.Provider placement="bottom end" />
      </body>
    </html>
  );
}
