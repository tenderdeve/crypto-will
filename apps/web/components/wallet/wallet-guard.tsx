"use client";

import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { type ReactNode } from "react";
import { Brand } from "@/components/landing/brand";

export function WalletGuard({ children }: { children: ReactNode }) {
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-8 px-6">
        <Brand size={28} />
        <div className="text-center space-y-3 max-w-md">
          <h2 className="serif text-3xl">Connect your wallet</h2>
          <p className="text-ink-2 text-[15px] leading-relaxed">
            You need to connect your wallet to access this page.
          </p>
        </div>
        <ConnectButton />
      </div>
    );
  }

  return <>{children}</>;
}
