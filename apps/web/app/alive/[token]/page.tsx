"use client";

import { useState, useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Brand } from "@/components/landing/brand";
import { useSignAlive } from "@/hooks/use-will";
import { useSignAliveTyped } from "@/hooks/use-sign-alive-typed";
import { CRYPTO_WILL_ADDRESS } from "@/lib/contracts";
import { use } from "react";
import { Mail, Sparkles, ArrowRight, Check } from "lucide-react";

export default function AliveCheckPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { signAlive, isPending: onchainPending, isSuccess: onchainSuccess, hash } = useSignAlive();
  const { signAliveGasless, isPending: gaslessPending, isSuccess: gaslessSuccess } = useSignAliveTyped();
  const [dbStatus, setDbStatus] = useState<"idle" | "syncing" | "done" | "error">("idle");
  const dbSynced = useRef(false);

  const [method, setMethod] = useState<"eip712" | "onchain">("onchain");
  const gaslessEnabled = process.env.NEXT_PUBLIC_GASLESS_ENABLED === "true";

  const isPending = method === "eip712" ? gaslessPending : onchainPending;
  const isSuccess = method === "eip712" ? gaslessSuccess : onchainSuccess;

  // After on-chain signAlive confirms, sync DB
  useEffect(() => {
    if (!onchainSuccess || !hash || dbSynced.current) return;
    dbSynced.current = true;
    setDbStatus("syncing");
    fetch("/api/alive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, txHash: hash }),
    })
      .then(() => setDbStatus("done"))
      .catch(() => setDbStatus("done"));
  }, [onchainSuccess, hash, token]);

  // Gasless path — relay handles everything, just mark done
  useEffect(() => {
    if (!gaslessSuccess) return;
    setDbStatus("done");
  }, [gaslessSuccess]);

  // Redirect to dashboard after success
  useEffect(() => {
    if (dbStatus !== "done") return;
    const t = setTimeout(() => router.push("/dashboard"), 3000);
    return () => clearTimeout(t);
  }, [dbStatus, router]);

  const handleSign = () => {
    if (!address) return;
    if (method === "eip712") {
      signAliveGasless();
    } else {
      signAlive();
    }
  };

  const isDone = isSuccess && dbStatus === "done";

  const now = new Date();
  const monthName = now.toLocaleString("en-US", { month: "long", year: "numeric" });

  const short = (a: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <header className="px-6 py-5 flex justify-between items-center border-b border-line-2 md:px-12">
        <Brand size={20} />
        <div className="mono text-xs text-ink-3">
          chainwill/alive/<span className="text-ink-2">{token.slice(0, 8)}…</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-[720px]">
          {!isDone ? (
            <div className="bg-paper border border-line rounded-hero-lg p-12 text-center shadow-elevated">
              {/* Eyebrow */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-pill bg-accent-soft text-accent text-[11px] tracking-[0.12em] uppercase font-medium">
                <Mail className="w-3.5 h-3.5" /> {monthName} check-in
              </div>

              {/* Headline */}
              <h1 className="serif text-5xl leading-none mt-6 mb-3.5 tracking-[-0.02em] md:text-[64px]">
                Are you
                <br />
                <em className="text-accent">still here?</em>
              </h1>

              {!isConnected ? (
                <div className="space-y-6 mt-8">
                  <p className="text-ink-2">
                    Connect the wallet associated with your will to continue.
                  </p>
                  <ConnectButton />
                </div>
              ) : (
                <>
                  <p className="text-base leading-relaxed text-ink-2 max-w-[460px] mx-auto">
                    One signature is all it takes. This proves you&apos;re
                    alive, resets your grace timer, and keeps your beneficiary
                    safely on hold.
                  </p>

                  {/* Method toggle */}
                  {gaslessEnabled && (
                    <div className="mt-8 inline-flex p-1 bg-bg-2 rounded-pill border border-line">
                      {(
                        [
                          ["eip712", "Gasless signature"],
                          ["onchain", "On-chain signAlive()"],
                        ] as const
                      ).map(([id, label]) => (
                        <button
                          key={id}
                          onClick={() => setMethod(id)}
                          className={`px-4 py-2 rounded-pill border-none text-[13px] cursor-pointer ${
                            method === id
                              ? "bg-ink text-paper"
                              : "bg-transparent text-ink-2"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Payload preview */}
                  <div className="mt-7 p-5 rounded-[14px] bg-bg border border-dashed border-line text-left max-w-[480px] mx-auto">
                    <div className="mono text-[10px] tracking-[0.14em] uppercase text-ink-3 mb-1.5">
                      {method === "eip712"
                        ? "EIP-712 typed data · ChainWill"
                        : "Contract call · signAlive()"}
                    </div>
                    {method === "eip712" ? (
                      <pre className="mono text-[11px] leading-relaxed text-ink-2 whitespace-pre-wrap m-0">
{`domain: ChainWill, chainId: 8453
type:   AliveProof
owner:  ${short(address || "")}
nonce:  pending
issued: ${new Date().toISOString().slice(0, 16)}Z`}
                      </pre>
                    ) : (
                      <pre className="mono text-[11px] leading-relaxed text-ink-2 whitespace-pre-wrap m-0">
{`to:     ${short(CRYPTO_WILL_ADDRESS || "")} (ChainWill)
fn:     signAlive()
chain:  Base (${process.env.NEXT_PUBLIC_CHAIN_ID || "8453"})
gas:    ~21,000 · est. $0.01`}
                      </pre>
                    )}
                  </div>

                  {/* CTA */}
                  <div className="mt-8">
                    <button
                      onClick={handleSign}
                      disabled={isPending || dbStatus === "syncing"}
                      className="inline-flex items-center gap-2.5 rounded-pill bg-ink text-paper px-7 py-4 text-base font-medium cursor-pointer border-none disabled:opacity-50"
                    >
                      {isPending ? (
                        method === "eip712"
                          ? "Confirm in wallet…"
                          : "Confirming on Base…"
                      ) : dbStatus === "syncing" ? (
                        "Recording…"
                      ) : method === "eip712" ? (
                        <>
                          Sign &quot;I&apos;m here&quot; message{" "}
                          <Sparkles className="w-4 h-4" />
                        </>
                      ) : (
                        <>
                          Submit signAlive(){" "}
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                  <div className="mt-4 text-xs text-ink-3">
                    {method === "eip712"
                      ? "No gas. Our relayer batches your proof on-chain within 24h."
                      : "Costs about $0.01 in gas on Base. Resets your timer instantly."}
                  </div>
                </>
              )}

              {/* Footer */}
              {isConnected && (
                <div className="mt-8 pt-6 border-t border-line flex justify-between text-xs text-ink-3">
                  <button
                    onClick={() => router.push("/dashboard")}
                    className="bg-transparent border-none cursor-pointer text-ink-3 underline text-xs"
                  >
                    ← Back to dashboard
                  </button>
                  <span>
                    Connected: {short(address || "")}
                  </span>
                </div>
              )}
            </div>
          ) : (
            /* Success state */
            <div className="bg-paper border border-line rounded-hero-lg p-16 text-center">
              <div className="w-22 h-22 rounded-full mx-auto bg-good text-white flex items-center justify-center">
                <Check className="w-10 h-10" />
              </div>
              <h1 className="serif text-[56px] leading-[1.05] mt-7 mb-3.5 tracking-[-0.02em]">
                Thank you for
                <br />
                <em className="text-accent">being here.</em>
              </h1>
              <p className="text-base leading-relaxed text-ink-2 max-w-[420px] mx-auto">
                Your timer is reset. We&apos;ll see you next month — go enjoy
                the rest of yours.
              </p>
              <div className="mt-8 text-xs text-ink-3">
                Redirecting to your dashboard…
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
