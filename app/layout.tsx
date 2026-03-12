import type { Metadata } from "next";
import type { ReactNode } from "react";
import { IBM_Plex_Serif, Work_Sans } from "next/font/google";
import "./globals.css";

const workSans = Work_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700"],
});

const ibmPlexSerif = IBM_Plex_Serif({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Sate Ayam Bento Admin",
  description: "Admin panel POS F&B untuk Sate Ayam Bento.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="id">
      <body className={`${workSans.variable} ${ibmPlexSerif.variable}`}>{children}</body>
    </html>
  );
}
