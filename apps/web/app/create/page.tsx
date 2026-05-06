"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { isAddress } from "viem";
import { WalletGuard } from "@/components/wallet/wallet-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useTokenApproval } from "@/hooks/use-token-approval";
import { useCreateWill } from "@/hooks/use-create-will";
import { useWalletTokens } from "@/hooks/use-wallet-tokens";

const GRACE_PERIOD_OPTIONS = [
  { label: "30 days", value: 30 },
  { label: "60 days", value: 60 },
  { label: "90 days", value: 90 },
  { label: "120 days", value: 120 },
  { label: "180 days", value: 180 },
];

function TokenApprovalRow({
  tokenAddress,
  symbol,
  balance,
  zeroBalanceWarning,
  onRemove,
  onApprovalChange,
}: {
  tokenAddress: `0x${string}`;
  symbol?: string;
  balance?: string;
  zeroBalanceWarning?: boolean;
  onRemove: () => void;
  onApprovalChange: (addr: string, approved: boolean) => void;
}) {
  const { isApproved, approve, isPending } = useTokenApproval(tokenAddress);

  useEffect(() => {
    onApprovalChange(tokenAddress, isApproved);
  }, [tokenAddress, isApproved, onApprovalChange]);

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium">{symbol || "Unknown"}</span>
            {balance && (
              <span className="text-sm text-muted-foreground">
                ({Number(balance).toLocaleString(undefined, { maximumFractionDigits: 4 })})
              </span>
            )}
          </div>
          <code className="text-xs text-muted-foreground truncate block">{tokenAddress}</code>
        </div>
        {isApproved ? (
          <Badge variant="default">Approved</Badge>
        ) : (
          <Button size="sm" onClick={approve} disabled={isPending}>
            {isPending ? "Approving..." : "Approve"}
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={onRemove}>
          ✕
        </Button>
      </div>
      {zeroBalanceWarning && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          No balance detected. Token is included but won&apos;t transfer if empty at execution.
        </p>
      )}
    </div>
  );
}

export default function CreateWillPage() {
  const router = useRouter();
  const { address } = useAccount();
  const [step, setStep] = useState(1);

  // Step 1 state
  const [beneficiary, setBeneficiary] = useState("");
  const [email, setEmail] = useState("");
  const [gracePeriod, setGracePeriod] = useState(90);

  // Step 2 state
  const [tokenInput, setTokenInput] = useState("");
  const [tokens, setTokens] = useState<`0x${string}`[]>([]);
  const [tokenMeta, setTokenMeta] = useState<Record<string, { symbol: string; balance: string }>>({});
  const [zeroBalanceTokens, setZeroBalanceTokens] = useState<Set<string>>(new Set());
  const [approvedSet, setApprovedSet] = useState<Set<string>>(new Set());
  const { tokens: detectedTokens, isLoading: tokensLoading } = useWalletTokens();

  const allApproved = tokens.length > 0 && tokens.every((t) => approvedSet.has(t));

  const handleApprovalChange = useCallback((addr: string, approved: boolean) => {
    setApprovedSet((prev) => {
      const next = new Set(prev);
      if (approved) next.add(addr);
      else next.delete(addr);
      return next;
    });
  }, []);

  // Step 3
  const { createWill, isPending, isSuccess, hash, error } = useCreateWill();
  const [dbSaving, setDbSaving] = useState(false);
  const dbSaveAttempted = useRef(false);

  // After on-chain tx confirms, save will metadata to DB then redirect
  useEffect(() => {
    if (!isSuccess || !hash || !address || dbSaveAttempted.current) return;
    dbSaveAttempted.current = true;
    setDbSaving(true);

    fetch("/api/will", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-wallet-address": address,
      },
      body: JSON.stringify({
        beneficiaryAddress: beneficiary,
        tokenAddresses: tokens,
        gracePeriodDays: gracePeriod,
        contractTxHash: hash,
        email: email || undefined,
      }),
    })
      .catch(() => {})
      .finally(() => {
        setDbSaving(false);
        router.push("/dashboard");
      });
  }, [isSuccess, hash, address, beneficiary, tokens, gracePeriod, email, router]);

  const addToken = (addr?: `0x${string}`, meta?: { symbol: string; balance: string }) => {
    const tokenAddr = addr || (tokenInput as `0x${string}`);
    if (!isAddress(tokenAddr) || tokens.includes(tokenAddr)) return;

    setTokens((prev) => [...prev, tokenAddr]);

    if (meta) {
      setTokenMeta((prev) => ({ ...prev, [tokenAddr]: meta }));
    } else {
      // Manual add — check if wallet has balance for this token
      const detected = detectedTokens.find(
        (t) => t.address.toLowerCase() === tokenAddr.toLowerCase()
      );
      if (detected) {
        setTokenMeta((prev) => ({ ...prev, [tokenAddr]: { symbol: detected.symbol, balance: detected.balance } }));
      } else {
        setZeroBalanceTokens((prev) => new Set(prev).add(tokenAddr));
      }
    }
    setTokenInput("");
  };

  const removeToken = (index: number) => {
    const removed = tokens[index];
    setTokens((prev) => prev.filter((_, i) => i !== index));
    setZeroBalanceTokens((prev) => {
      const next = new Set(prev);
      next.delete(removed);
      return next;
    });
    setApprovedSet((prev) => {
      const next = new Set(prev);
      next.delete(removed);
      return next;
    });
  };

  const handleCreate = () => {
    const gracePeriodSeconds = BigInt(gracePeriod * 24 * 60 * 60);
    createWill(beneficiary as `0x${string}`, tokens, gracePeriodSeconds);
  };

  return (
    <WalletGuard>
      <div className="container mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">Create Your Will</h1>
        <p className="text-muted-foreground mb-8">Step {step} of 3</p>

        {/* Progress bar */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 flex-1 rounded-full ${s <= step ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>

        {/* Step 1: Details */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Beneficiary Details</CardTitle>
              <CardDescription>
                Enter who should receive your tokens and how long to wait.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="beneficiary">Beneficiary Wallet Address</Label>
                <Input
                  id="beneficiary"
                  placeholder="0x..."
                  value={beneficiary}
                  onChange={(e) => setBeneficiary(e.target.value)}
                />
                {beneficiary && !isAddress(beneficiary) && (
                  <p className="text-sm text-destructive">Invalid address</p>
                )}
                {beneficiary && beneficiary.toLowerCase() === address?.toLowerCase() && (
                  <p className="text-sm text-destructive">Cannot be your own address</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Your Email (for alive check reminders)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="grace">Grace Period</Label>
                <select
                  id="grace"
                  value={gracePeriod}
                  onChange={(e) => setGracePeriod(Number(e.target.value))}
                  className="w-full rounded-md border bg-background px-3 py-2"
                >
                  {GRACE_PERIOD_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-muted-foreground">
                  Your will executes if you miss {Math.floor(gracePeriod / 30)} monthly check-ins.
                </p>
              </div>

              <Button
                className="w-full"
                onClick={() => setStep(2)}
                disabled={
                  !isAddress(beneficiary) ||
                  beneficiary.toLowerCase() === address?.toLowerCase() ||
                  !email
                }
              >
                Next: Select Tokens
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Token Approval */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Select & Approve Tokens</CardTitle>
              <CardDescription>
                Add tokens and approve each one. All must be approved before proceeding.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {tokensLoading && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Detecting tokens in your wallet...
                </p>
              )}

              {!tokensLoading && detectedTokens.length > 0 && (
                <div className="space-y-2">
                  <Label>Your Tokens</Label>
                  {detectedTokens
                    .filter((t) => !tokens.includes(t.address))
                    .map((t) => (
                      <div
                        key={t.address}
                        className="flex items-center justify-between gap-2 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => addToken(t.address, { symbol: t.symbol, balance: t.balance })}
                      >
                        <div>
                          <span className="font-medium">{t.symbol}</span>
                          <span className="text-sm text-muted-foreground ml-2">
                            {Number(t.balance).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                          </span>
                        </div>
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); addToken(t.address, { symbol: t.symbol, balance: t.balance }); }}>
                          + Add
                        </Button>
                      </div>
                    ))}
                </div>
              )}

              {tokens.length > 0 && (
                <div className="space-y-2">
                  <Label>
                    Selected — Approve Each Token
                    {tokens.length > 0 && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        ({approvedSet.size}/{tokens.length} approved)
                      </span>
                    )}
                  </Label>
                  {tokens.map((token, i) => (
                    <TokenApprovalRow
                      key={token}
                      tokenAddress={token}
                      symbol={tokenMeta[token]?.symbol}
                      balance={tokenMeta[token]?.balance}
                      zeroBalanceWarning={zeroBalanceTokens.has(token)}
                      onRemove={() => removeToken(i)}
                      onApprovalChange={handleApprovalChange}
                    />
                  ))}
                </div>
              )}

              <div className="border-t pt-4">
                <Label className="text-sm text-muted-foreground">Add token manually</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Token contract address (0x...)"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                  />
                  <Button onClick={() => addToken()} disabled={!isAddress(tokenInput)}>
                    Add
                  </Button>
                </div>
              </div>

              {tokens.length === 0 && !tokensLoading && detectedTokens.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No tokens detected. Add token addresses manually above.
                </p>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => setStep(3)}
                  disabled={tokens.length === 0 || !allApproved}
                  title={!allApproved ? "Approve all tokens before proceeding" : undefined}
                >
                  {!allApproved && tokens.length > 0
                    ? `Approve all tokens (${approvedSet.size}/${tokens.length})`
                    : "Next: Review & Create"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Review & Create */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Review & Create Will</CardTitle>
              <CardDescription>
                Confirm the details below and create your on-chain will.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4 rounded-lg border p-4">
                <div>
                  <p className="text-sm text-muted-foreground">Beneficiary</p>
                  <code className="text-sm">{beneficiary}</code>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Grace Period</p>
                  <p className="font-medium">{gracePeriod} days</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tokens ({tokens.length})</p>
                  <div className="space-y-1 mt-1">
                    {tokens.map((t) => (
                      <div key={t} className="flex items-center gap-2">
                        <code className="text-xs truncate">{t}</code>
                        {zeroBalanceTokens.has(t) && (
                          <span className="text-xs text-amber-600 shrink-0">⚠ no balance</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p>{email}</p>
                </div>
                <div className="rounded-md bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">
                    Note: Only ERC-20 tokens listed above are covered. Your wallet&apos;s native ETH
                    is not automatically included — deposit ETH separately from the dashboard after
                    creation.
                  </p>
                </div>
              </div>

              {error && (
                <div className="rounded-lg border border-destructive p-3">
                  <p className="text-sm text-destructive">
                    Transaction failed: {error.message.slice(0, 100)}
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(2)}
                  disabled={isPending || dbSaving}
                >
                  Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleCreate}
                  disabled={isPending || dbSaving}
                >
                  {dbSaving ? "Saving..." : isPending ? "Creating Will..." : "Create Will"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </WalletGuard>
  );
}
