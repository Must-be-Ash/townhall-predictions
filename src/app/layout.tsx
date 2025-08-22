import type { Metadata } from "next";
import { Inter, Climate_Crisis } from "next/font/google";
import { Analytics } from '@vercel/analytics/react';
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const climateCrisis = Climate_Crisis({
  subsets: ["latin"],
  variable: "--font-climate-crisis",
  weight: "400",
});

export const metadata: Metadata = {
  title: "Townhall",
  description: "prediction market fun without the risks",
  metadataBase: new URL("https://www.townhall.lol"),
  openGraph: {
    title: "Townhall",
    description: "prediction market fun without the risks",
    url: "https://www.townhall.lol",
    siteName: "Townhall",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Townhall - prediction market fun without the risks",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Townhall",
    description: "prediction market fun without the risks",
    creator: "@must_be_ash",
    images: ["/og.png"],
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      { url: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  manifest: "/site.webmanifest",
  authors: [{ name: "@must_be_ash" }],
  creator: "@must_be_ash",
  keywords: ["prediction market", "town hall", "betting", "crypto", "web3"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={`${inter.variable} ${climateCrisis.variable} font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
