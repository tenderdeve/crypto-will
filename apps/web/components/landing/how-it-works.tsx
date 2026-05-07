import { Wallet, FileText, Mail, Clock } from "lucide-react";
import type { ReactNode } from "react";

const steps: { n: string; t: string; d: string; icon: ReactNode }[] = [
  {
    n: "01",
    t: "Connect",
    d: "Link your wallet via RainbowKit — MetaMask, Coinbase, WalletConnect, etc.",
    icon: <Wallet className="w-[18px] h-[18px]" />,
  },
  {
    n: "02",
    t: "Approve & assign",
    d: "Pick ERC-20s to will and a single beneficiary. Deposit ETH if you want it covered too.",
    icon: <FileText className="w-[18px] h-[18px]" />,
  },
  {
    n: "03",
    t: "Check in via email",
    d: "Reply to a monthly email with a gasless signature — or call signAlive() yourself.",
    icon: <Mail className="w-[18px] h-[18px]" />,
  },
  {
    n: "04",
    t: "Silence triggers it",
    d: "After your chosen grace period (30–180 days), anyone can execute. Permissionless.",
    icon: <Clock className="w-[18px] h-[18px]" />,
  },
];

export function HowItWorks() {
  return (
    <section
      id="how"
      className="px-6 py-20 bg-bg-2 border-y border-line-2 md:px-12"
    >
      <div className="mx-auto max-w-[1240px]">
        <div className="flex flex-col justify-between gap-6 mb-14 md:flex-row md:items-end">
          <div>
            <div className="text-xs tracking-[0.12em] uppercase text-ink-3 mb-3">
              How it works
            </div>
            <h2 className="serif text-4xl tracking-[-0.015em] m-0 md:text-[52px]">
              Four steps.{" "}
              <em className="text-accent">One peace of mind.</em>
            </h2>
          </div>
          <div className="text-sm text-ink-2 max-w-[320px]">
            You stay in control the whole time. Your funds never leave your
            wallet until the contract proves you&apos;ve stopped checking in.
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div
              key={s.n}
              className="bg-paper border border-line rounded-cards-lg p-6 min-h-[220px] flex flex-col justify-between hover:-translate-y-0.5 hover:shadow-elevated transition-all duration-200"
            >
              <div className="mono text-xs text-ink-3">{s.n}</div>
              <div>
                <div className="w-[38px] h-[38px] rounded-[10px] mb-4 bg-accent-soft text-accent inline-flex items-center justify-center">
                  {s.icon}
                </div>
                <div className="serif text-[26px] leading-[1.1] mb-2 text-ink">
                  {s.t}
                </div>
                <div className="text-sm text-ink-2 leading-relaxed">{s.d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
