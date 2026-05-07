"use client";

import { useState } from "react";

const trustItems = [
  ["Network", "Base mainnet"],
  ["Contract", "0x4c5e…9a17 (verified)"],
  ["Audit", "Placeholder · pre-launch"],
  ["Source", "github.com/tenderdeve/crypto-will"],
];

const faqItems = [
  {
    q: "What if I forget to check in?",
    a: "Your grace period is whatever you set it to (30 to 180 days). Within that window, signing any check-in resets the timer. Once it expires, anyone can call executeWill(yourAddress) on the contract — it's permissionless.",
  },
  {
    q: "Can ChainWill access my funds?",
    a: "No. The contract is non-custodial. We can't move your tokens — we only send the monthly email. Even if we shut down tomorrow, the contract on Base keeps running and your beneficiary (or anyone) can still trigger execution.",
  },
  {
    q: "What if my beneficiary loses their wallet?",
    a: "You can update the beneficiary address any time. We recommend writing the address down somewhere physical and telling at least one trusted person about ChainWill so they know to look.",
  },
  {
    q: "Which tokens are supported?",
    a: "Any ERC-20 token on Base. ETH is supported too — but only ETH you explicitly deposit into the contract from the dashboard. Wallet ETH stays in your wallet and isn't covered.",
  },
  {
    q: "Does the monthly check-in cost gas?",
    a: "By default it's gasless: you sign a typed EIP-712 message in your wallet (free) and our relayer records it. You can also fall back to an on-chain signAlive() if you prefer — same effect, costs gas.",
  },
];

function FAQ() {
  const [open, setOpen] = useState(0);

  return (
    <div>
      {faqItems.map((it, i) => (
        <div key={i} className="border-t border-white/10">
          <button
            onClick={() => setOpen(open === i ? -1 : i)}
            className="w-full py-5 flex justify-between items-center bg-transparent border-none text-left cursor-pointer"
            style={{ color: "var(--bg)" }}
          >
            <span className="serif text-[22px] pr-4">{it.q}</span>
            <span
              className="w-7 h-7 rounded-full border border-white/30 inline-flex items-center justify-center text-lg shrink-0 transition-transform duration-200"
              style={{ transform: open === i ? "rotate(45deg)" : "rotate(0)" }}
            >
              +
            </span>
          </button>
          {open === i && (
            <div className="pb-6 text-[15px] leading-relaxed text-white/70 max-w-[540px]">
              {it.a}
            </div>
          )}
        </div>
      ))}
      <div className="border-t border-white/10" />
    </div>
  );
}

export function TrustFAQ() {
  return (
    <section id="trust" className="px-6 py-20 md:px-12" style={{ background: "var(--ink)", color: "var(--bg)" }}>
      <div className="mx-auto max-w-[1240px] grid grid-cols-1 gap-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-[72px]">
        <div>
          <div className="text-xs tracking-[0.12em] uppercase text-white/50 mb-3">
            Built to be boring
          </div>
          <h2 className="serif text-4xl tracking-[-0.015em] m-0 md:text-[56px]" style={{ color: "var(--bg)" }}>
            Verifiable, by design.
          </h2>
          <p className="text-[17px] leading-relaxed text-white/70 mt-6 max-w-[420px]">
            Every action runs through a single, audited smart contract. We
            can&apos;t move your funds. Neither can a court order on us. Only the
            contract — and only after you&apos;ve gone quiet for the grace period
            you set.
          </p>
          <div className="mt-10 grid gap-4">
            {trustItems.map(([k, v]) => (
              <div
                key={k}
                className="flex justify-between pb-3.5 border-b border-white/10"
              >
                <span className="text-[13px] text-white/50">{k}</span>
                <span className="mono text-[13px]">{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div id="faq">
          <div className="text-xs tracking-[0.12em] uppercase text-white/50 mb-3">
            Frequently asked
          </div>
          <h3 className="serif text-3xl m-0 mb-8 md:text-[40px]" style={{ color: "var(--bg)" }}>
            The questions everyone asks first.
          </h3>
          <FAQ />
        </div>
      </div>
    </section>
  );
}
