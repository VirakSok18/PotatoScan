import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "glisse/styles.css";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PotatoScan",
  description: "Ad-free manga, manhwa, and manhua reader.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0c0c0e",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className="min-h-screen bg-[#0c0c0e] text-[#f4f4f6] selection:bg-[#38bdf8] selection:text-[#07131a]"
      >
        {children}
      </body>
    </html>
  );
}
