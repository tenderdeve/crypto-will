"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/ui/button";

export function CTA() {
  return (
    <section className="px-4 py-20 sm:py-28">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Ready to Protect Your Legacy?
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Set up your crypto will in minutes. Non-custodial, trustless, and
          completely on-chain.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
          <ConnectButton />
          <Link href="/create">
            <Button variant="outline" size="lg" className="h-12 px-8 text-base">
              Get Started
            </Button>
          </Link>
        </div>

        <p className="mt-8 text-sm text-muted-foreground">
          <Link
            href="#how-it-works"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Learn how it works
          </Link>
        </p>
      </div>
    </section>
  );
}
