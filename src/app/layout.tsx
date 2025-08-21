import type { Metadata } from "next";
import { Inter, Climate_Crisis } from "next/font/google";
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
  title: "Townhall Predictions",
  description: "Binary prediction markets for town hall events",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${climateCrisis.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
