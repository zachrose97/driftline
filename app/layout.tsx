import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import NavBar from "@/components/NavBar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "DriftLine — The All-in-One Fly Fishing Platform",
  description: "Live stream conditions, hatch calendars, guide reports, stocking alerts, and a free catch logbook for fly fishers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}>
        <NavBar />
        {children}
      </body>
    </html>
  );
}
