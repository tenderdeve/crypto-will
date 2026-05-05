"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-4 py-24 sm:py-32 lg:py-40">
      {/* Gradient background */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 via-background to-background" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />

      <div className="mx-auto max-w-4xl text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          Your Crypto, Protected Forever
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground sm:text-xl">
          A dead man&apos;s switch for your digital assets. If you become
          inactive, your tokens are automatically and trustlessly transferred to
          your chosen beneficiary. Non-custodial, on-chain, and secure.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
          <Link href="/create">
            <Button size="lg" className="text-base px-8 py-3 h-12">
              Create Your Will
            </Button>
          </Link>
          <ConnectButton />
        </div>
      </div>
    </section>
  );
}
