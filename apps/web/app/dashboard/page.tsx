"use client";

import { useAccount } from "wagmi";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { WalletGuard } from "@/components/wallet/wallet-guard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useWill, useSignAlive, useRevokeWill } from "@/hooks/use-will";

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
  const { will, hasWill, isLoading } = useWill();
  const { signAlive, isPending: isSigningAlive, isSuccess: aliveSuccess, hash: aliveHash } = useSignAlive();
  const { revokeWill, isPending: isRevoking, isSuccess: revokeSuccess } = useRevokeWill();
  const aliveSynced = useRef(false);

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

                {/* Token list */}
                {will.tokens.length > 0 && (
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground mb-2">Token Addresses</p>
                    <div className="space-y-1">
                      {will.tokens.map((t: string) => (
                        <code key={t} className="text-xs block truncate">{t}</code>
                      ))}
                    </div>
                  </div>
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
