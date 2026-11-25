import type { Metadata, Viewport } from "next";
import { Young_Serif, Hind } from "next/font/google";
import ModeTransitionProvider from "@/components/ModeTransitionProvider";
import "./globals.css";

const display = Young_Serif({ weight: "400", subsets: ["latin"], variable: "--font-display", display: "swap" });
const body = Hind({ weight: ["400", "500", "600", "700"], subsets: ["latin", "devanagari"], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  title: "Kal Kya?",
  description: "Decide together what to cook tomorrow.",
  openGraph: {
    title: "Kal Kya?",
    description: "Decide together what to cook tomorrow.",
    images: ["/kalkyalogo.png"],
  },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#FBF4E6" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <ModeTransitionProvider>{children}</ModeTransitionProvider>
      </body>
    </html>
  );
}
