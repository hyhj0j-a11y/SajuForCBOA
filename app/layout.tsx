import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const description =
  "Your Four Pillars in plain English — a mirror for how you learn, not a map of your future.";

/**
 * No `metadataBase`: on Vercel, Next.js falls back to the production URL for the absolute
 * og:image link. The icons and the preview image come from `icon.tsx`, `apple-icon.tsx` and
 * `opengraph-image.tsx` in this folder.
 */
export const metadata: Metadata = {
  title: "Academy Saju — a mirror, not a map",
  description,
  applicationName: "Academy Saju",
  openGraph: {
    type: "website",
    siteName: "Academy Saju",
    title: "Academy Saju — Who decides your future?",
    description,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Academy Saju — Who decides your future?",
    description,
  },
};

export const viewport: Viewport = {
  themeColor: "#faf7f1",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
