import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Forge Athletic Club | Train hard. Play strong.",
    template: "%s | Forge Athletic Club",
  },
  description:
    "A multi-sport club in Mumbai for training, competition, coaching, and community. Find your sport and join Forge Athletic Club.",
  applicationName: "Forge Athletic Club",
  openGraph: {
    title: "Forge Athletic Club",
    description: "Train hard. Play strong. Live better.",
    type: "website",
    locale: "en_IN",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  userScalable: true,
  colorScheme: "dark",
  themeColor: "#0c0d0d",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
