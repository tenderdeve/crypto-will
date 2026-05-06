"use client";

import { useAccount } from "wagmi";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { isAddress } from "viem";
import { WalletGuard } from "@/components/wallet/wallet-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { parseEther, formatEther } from "viem";
import { useWill, useSignAlive, useRevokeWill, useUpdateTokens, useEthBalance, useDepositETH } from "@/hooks/use-will";

function formatTimestamp(timestamp: bigint): string {
  if (!timestamp || timestamp === BigInt(0)) return "Never";
  return new Date(Number(timestamp) * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatGracePeriod(seconds: bigint): string {
  const days = Number(seconds) / 86400;
  return `${days} days`;
}

export default function DashboardPage() {
  const { address } = useAccount();
  const { will, hasWill, isLoading, refetch } = useWill();
  const { signAlive, isPending: isSigningAlive, isSuccess: aliveSuccess, hash: aliveHash } = useSignAlive();
  const { revokeWill, isPending: isRevoking, isSuccess: revokeSuccess } = useRevokeWill();
  const { updateTokens, isPending: isUpdatingTokens, isSuccess: updateSuccess, error: updateError } = useUpdateTokens();
  const { balance: depositedETH, refetch: refetchETH } = useEthBalance();
  const { depositETH, isPending: isDepositing, isSuccess: depositSuccess, error: depositError } = useDepositETH();
  const aliveSynced = useRef(false);
  const updateSynced = useRef(false);
  const depositSynced = useRef(false);

  const [ethInput, setEthInput] = useState("");

  // Token management local state
  const [localTokens, setLocalTokens] = useState<string[]>([]);
  const [tokenInput, setTokenInput] = useState("");
  const [tokensDirty, setTokensDirty] = useState(false);

  // Sync local token list when will data loads
  useEffect(() => {
    if (will?.tokens) {
      setLocalTokens([...will.tokens]);
      setTokensDirty(false);
    }
  }, [will?.tokens]);

  // After updateTokens confirms, refetch will data (ref guard prevents re-fire on remount)
  useEffect(() => {
    if (!updateSuccess || updateSynced.current) return;
    updateSynced.current = true;
    refetch();
    setTokensDirty(false);
  }, [updateSuccess, refetch]);

  // After depositETH confirms, refetch balance
  useEffect(() => {
    if (!depositSuccess || depositSynced.current) return;
    depositSynced.current = true;
    refetchETH();
    setEthInput("");
  }, [depositSuccess, refetchETH]);

  // After on-chain signAlive confirms, sync DB last_alive_at
  useEffect(() => {
    if (!aliveSuccess || !aliveHash || !address || aliveSynced.current) return;
    aliveSynced.current = true;

    fetch("/api/alive", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-wallet-address": address,
      },
      body: JSON.stringify({ source: "dashboard", txHash: aliveHash }),
    }).catch(() => {}); // Best effort — on-chain is source of truth
  }, [aliveSuccess, aliveHash, address]);

  const addLocalToken = () => {
    const lower = tokenInput.toLowerCase();
    if (!isAddress(tokenInput) || localTokens.some((t) => t.toLowerCase() === lower)) return;
    setLocalTokens((prev) => [...prev, tokenInput]);
    setTokenInput("");
    setTokensDirty(true);
  };

  const removeLocalToken = (index: number) => {
    setLocalTokens((prev) => prev.filter((_, i) => i !== index));
    setTokensDirty(true);
  };

  const handleSaveTokens = () => {
    if (localTokens.length === 0) return;
    updateTokens(localTokens as `0x${string}`[]);
  };

  const handleDeposit = () => {
    try {
      const wei = parseEther(ethInput);
      if (wei <= BigInt(0)) return;
      depositETH(wei);
    } catch {
      // parseEther throws on invalid input — input validation handles this in the UI
    }
  };

  const ethInputValid = (() => {
    try { return parseEther(ethInput) > BigInt(0); } catch { return false; }
  })();

  return (
    <WalletGuard>
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground mb-8">
          Manage your crypto will
        </p>

        {isLoading && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Loading your will...</p>
            </CardContent>
          </Card>
        )}

        {!isLoading && !hasWill && (
          <Card>
            <CardContent className="py-12 text-center space-y-4">
              <h2 className="text-xl font-semibold">No Will Found</h2>
              <p className="text-muted-foreground">
                You haven&apos;t created a will yet. Protect your crypto legacy now.
              </p>
              <Link href="/create">
                <Button size="lg">Create Your Will</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {!isLoading && hasWill && will && (
          <div className="space-y-6">
            {/* Status Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Your Will</CardTitle>
                  <Badge variant={will.active ? "default" : "secondary"}>
                    {will.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <CardDescription>
                  Connected as {address?.slice(0, 6)}...{address?.slice(-4)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Beneficiary</p>
                    <code className="text-sm">
                      {will.beneficiary.slice(0, 6)}...{will.beneficiary.slice(-4)}
                    </code>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Grace Period</p>
                    <p className="font-medium">{formatGracePeriod(will.gracePeriod)}</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Last Alive</p>
                    <p className="font-medium">{formatTimestamp(will.lastAlive)}</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Tokens Included</p>
                    <p className="font-medium">{will.tokens.length} token(s)</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Token Management */}
            <Card>
              <CardHeader>
                <CardTitle>Token List</CardTitle>
                <CardDescription>
                  Add or remove ERC-20 tokens from your will. New tokens must be approved
                  separately via the token contract before they can be transferred.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {localTokens.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tokens in will.</p>
                ) : (
                  <div className="space-y-2">
                    {localTokens.map((t, i) => (
                      <div key={t} className="flex items-center justify-between gap-2 rounded-lg border p-3">
                        <code className="text-xs truncate flex-1">{t}</code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeLocalToken(i)}
                          disabled={isUpdatingTokens}
                        >
                          ✕
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Input
                    placeholder="Token contract address (0x...)"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                  />
                  <Button
                    variant="outline"
                    onClick={addLocalToken}
                    disabled={!isAddress(tokenInput) || localTokens.some((t) => t.toLowerCase() === tokenInput.toLowerCase())}
                  >
                    + Add
                  </Button>
                </div>

                {localTokens.length === 0 && tokensDirty && (
                  <p className="text-xs text-destructive">
                    Will must have at least one token.
                  </p>
                )}

                {updateError && (
                  <p className="text-sm text-destructive">
                    {updateError.message.slice(0, 120)}
                  </p>
                )}

                {updateSuccess && (
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Token list updated on-chain.
                  </p>
                )}

                <Button
                  className="w-full"
                  onClick={handleSaveTokens}
                  disabled={!tokensDirty || localTokens.length === 0 || isUpdatingTokens}
                >
                  {isUpdatingTokens ? "Saving..." : "Save Token Changes"}
                </Button>
              </CardContent>
            </Card>

            {/* ETH Deposit */}
            <Card>
              <CardHeader>
                <CardTitle>ETH Deposit</CardTitle>
                <CardDescription>
                  Only ETH deposited here is covered by your will. Your wallet&apos;s ETH balance
                  is not automatically included — it stays in your wallet until deposited.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Deposited in Contract</p>
                  <p className="text-xl font-semibold">{formatEther(depositedETH)} ETH</p>
                </div>

                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.001"
                    placeholder="Amount in ETH (e.g. 0.5)"
                    value={ethInput}
                    onChange={(e) => setEthInput(e.target.value)}
                  />
                  <Button
                    onClick={handleDeposit}
                    disabled={!ethInputValid || isDepositing}
                  >
                    {isDepositing ? "Depositing..." : "Deposit"}
                  </Button>
                </div>

                {depositError && (
                  <p className="text-sm text-destructive">
                    {depositError.message.slice(0, 120)}
                  </p>
                )}
                {depositSuccess && (
                  <p className="text-sm text-green-600 dark:text-green-400">
                    ETH deposited. Balance updated.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={signAlive}
                    disabled={isSigningAlive}
                    className="flex-1"
                  >
                    {isSigningAlive ? "Signing..." : aliveSuccess ? "Confirmed! ✓" : "Sign Alive"}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={revokeWill}
                    disabled={isRevoking}
                    className="flex-1"
                  >
                    {isRevoking ? "Revoking..." : revokeSuccess ? "Revoked ✓" : "Revoke Will"}
                  </Button>
                </div>
                {aliveSuccess && (
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Alive check confirmed on-chain. Your timer has been reset.
                  </p>
                )}
                {revokeSuccess && (
                  <p className="text-sm text-orange-600 dark:text-orange-400">
                    Will revoked. Any deposited ETH has been refunded.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </WalletGuard>
  );
}
