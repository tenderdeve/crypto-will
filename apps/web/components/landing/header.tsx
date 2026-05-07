"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { Brand } from "./brand";
import { useWill } from "@/hooks/use-will";

export function LandingHeader() {
  const { isConnected } = useAccount();
  const { hasWill } = useWill();

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-5 border-b border-line-2 bg-bg md:px-12">
      <Brand />
      <nav className="hidden items-center gap-7 text-sm text-ink-2 md:flex">
        <a href="#how" className="no-underline hover:text-ink transition-colors">
          How it works
        </a>
        <a href="#trust" className="no-underline hover:text-ink transition-colors">
          Security
        </a>
        <a href="#faq" className="no-underline hover:text-ink transition-colors">
          FAQ
        </a>
        {isConnected && hasWill && (
          <Link href="/dashboard" className="no-underline text-accent font-medium hover:text-accent/80 transition-colors">
            Dashboard
          </Link>
        )}
        {isConnected && !hasWill && (
          <Link
            href="/create"
            className="inline-flex items-center gap-2 rounded-pill bg-ink text-paper px-4 py-2 text-sm font-medium no-underline hover:opacity-90 transition-opacity"
          >
            Create Will
          </Link>
        )}
        <ConnectButton />
      </nav>
      <div className="flex items-center gap-3 md:hidden">
        {isConnected && hasWill && (
          <Link href="/dashboard" className="text-accent text-sm font-medium no-underline">
            Dashboard
          </Link>
        )}
        <ConnectButton />
      </div>
    </header>
  );
}
