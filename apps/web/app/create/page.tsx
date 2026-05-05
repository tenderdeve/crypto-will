"use client";

import { useState } from "react";
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

const GRACE_PERIOD_OPTIONS = [
  { label: "30 days", value: 30 },
  { label: "60 days", value: 60 },
  { label: "90 days", value: 90 },
  { label: "120 days", value: 120 },
  { label: "180 days", value: 180 },
];

function TokenApprovalRow({ tokenAddress, onRemove }: { tokenAddress: `0x${string}`; onRemove: () => void }) {
  const { isApproved, approve, isPending } = useTokenApproval(tokenAddress);

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border p-3">
      <code className="text-sm truncate flex-1">{tokenAddress}</code>
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

  // Step 3
  const { createWill, isPending, isSuccess, error } = useCreateWill();

  const addToken = () => {
    if (isAddress(tokenInput) && !tokens.includes(tokenInput as `0x${string}`)) {
      setTokens([...tokens, tokenInput as `0x${string}`]);
      setTokenInput("");
    }
  };

  const removeToken = (index: number) => {
    setTokens(tokens.filter((_, i) => i !== index));
  };

  const handleCreate = () => {
    const gracePeriodSeconds = BigInt(gracePeriod * 24 * 60 * 60);
    createWill(beneficiary as `0x${string}`, tokens, gracePeriodSeconds);
  };

  if (isSuccess) {
    router.push("/dashboard");
  }

  return (
    <WalletGuard>
      <div className="container mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">Create Your Will</h1>
        <p className="text-muted-foreground mb-8">
          Step {step} of 3
        </p>

        {/* Progress bar */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 flex-1 rounded-full ${
                s <= step ? "bg-primary" : "bg-muted"
              }`}
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
                Add ERC-20 token addresses and approve the contract to transfer them.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-2">
                <Input
                  placeholder="Token contract address (0x...)"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                />
                <Button onClick={addToken} disabled={!isAddress(tokenInput)}>
                  Add
                </Button>
              </div>

              {tokens.length > 0 && (
                <div className="space-y-2">
                  {tokens.map((token, i) => (
                    <TokenApprovalRow
                      key={token}
                      tokenAddress={token}
                      onRemove={() => removeToken(i)}
                    />
                  ))}
                </div>
              )}

              {tokens.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No tokens added yet. Enter a token contract address above.
                </p>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => setStep(3)}
                  disabled={tokens.length === 0}
                >
                  Next: Review & Create
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
                      <code key={t} className="text-xs block truncate">{t}</code>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p>{email}</p>
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
                <Button variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleCreate}
                  disabled={isPending}
                >
                  {isPending ? "Creating Will..." : "Create Will"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </WalletGuard>
  );
}
