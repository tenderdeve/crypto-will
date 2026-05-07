import type { Metadata } from "next";
import { Inter_Tight, JetBrains_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { NetworkBanner } from "@/components/layout/network-banner";

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: "400",
  style: ["normal", "italic"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "ChainWill — A quiet promise on-chain",
  description:
    "A non-custodial crypto will on Base. Approve your tokens, check in monthly, and know your loved ones are taken care of.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${interTight.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} font-sans`}>
        <Providers>
          <NetworkBanner />
          {children}
        </Providers>
      </body>
    </html>
  );
}
