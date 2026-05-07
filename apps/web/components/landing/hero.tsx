"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useWill } from "@/hooks/use-will";
import { Shield, Lock, Heart, ArrowRight } from "lucide-react";

function HeroDoc() {
  return (
    <div className="relative hidden h-[520px] items-center justify-center lg:flex">
      {/* Back paper */}
      <div
        className="absolute w-[320px] h-[420px] bg-bg-2 border border-line rounded"
        style={{ transform: "rotate(-6deg) translate(-30px, 20px)" }}
      />
      {/* Main paper */}
      <div
        className="relative w-[360px] h-[460px] bg-paper border border-line rounded px-9 pt-10 shadow-elevated"
        style={{ transform: "rotate(2deg)" }}
      >
        <div className="mono text-[10px] text-ink-3 tracking-[0.15em]">
          ON-CHAIN INSTRUMENT
        </div>
        <div className="serif text-[32px] leading-[1.1] mt-3 text-ink">
          Last Will, in code.
        </div>
        <div className="mt-6 h-px bg-line" />
        <div className="mt-5 space-y-1.5 text-xs text-ink-2">
          <div className="flex justify-between">
            <span className="text-ink-3">Testator</span>
            <span className="mono">0xA3f1…d29c</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-3">Beneficiary</span>
            <span className="mono">0x7B0e…41a8</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-3">Cadence</span>
            <span>Monthly · 30d grace</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-3">Assets</span>
            <span>2.84 ETH · 4,200 USDC</span>
          </div>
        </div>
        {/* Signature line */}
        <div className="absolute bottom-14 left-9 right-9">
          <svg width="100%" height="36" viewBox="0 0 280 36">
            <path
              d="M5 24 C 30 8, 50 30, 80 18 S 130 6, 170 22 S 230 30, 270 14"
              fill="none"
              stroke="var(--ink)"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
          <div className="mono text-[10px] text-ink-3 mt-1">
            Signed · block 21,448,902
          </div>
        </div>
        {/* Stamp */}
        <div
          className="absolute right-5 bottom-5 w-[90px] h-[90px] rounded-full border-2 border-accent text-accent flex items-center justify-center opacity-85"
          style={{ transform: "rotate(-12deg)" }}
        >
          <div className="text-center leading-[1.2]">
            <div className="serif text-sm tracking-normal">VERIFIED</div>
            <div className="mono text-[9px] tracking-[0.1em]">ON-CHAIN</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Hero() {
  const { isConnected } = useAccount();
  const { hasWill } = useWill();

  return (
    <section className="px-6 py-24 md:px-12 md:py-24">
      <div className="mx-auto max-w-[1240px]">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-pill bg-accent-soft text-accent px-3 py-1.5 text-xs font-medium tracking-[0.02em] uppercase mb-7">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              Live on Base · audit pending
            </div>
            <h1 className="serif text-6xl leading-[0.98] tracking-[-0.02em] text-ink m-0 md:text-7xl lg:text-[84px]">
              A quiet promise
              <br />
              <em className="text-accent italic">on-chain.</em>
            </h1>
            <p className="text-lg leading-relaxed text-ink-2 max-w-[480px] mt-7 mb-9">
              ChainWill is a simple way to make sure the people you love can
              reach your crypto if you can&apos;t. No lawyers. No custodian.
              Just a contract that listens.
            </p>
            <div className="flex flex-wrap items-center gap-3.5">
              {isConnected && hasWill ? (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2.5 rounded-pill bg-ink text-paper px-5 py-3.5 text-[15px] font-medium no-underline hover:opacity-90 transition-opacity"
                >
                  Go to Dashboard <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <Link
                  href="/create"
                  className="inline-flex items-center gap-2.5 rounded-pill bg-ink text-paper px-5 py-3.5 text-[15px] font-medium no-underline hover:opacity-90 transition-opacity"
                >
                  Set up your will <ArrowRight className="w-4 h-4" />
                </Link>
              )}
              <ConnectButton />
            </div>
            <div className="mt-11 flex flex-wrap gap-8 text-ink-3 text-[13px]">
              <span className="inline-flex items-center gap-2">
                <Shield className="w-4 h-4" /> Non-custodial
              </span>
              <span className="inline-flex items-center gap-2">
                <Lock className="w-4 h-4" /> Open-source contract
              </span>
              <span className="inline-flex items-center gap-2">
                <Heart className="w-4 h-4" /> Permissionless execution
              </span>
            </div>
          </div>
          <HeroDoc />
        </div>
      </div>
    </section>
  );
}
