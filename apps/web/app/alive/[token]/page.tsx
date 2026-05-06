"use client";

import { useState, useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { use } from "react";
import { useSignAlive } from "@/hooks/use-will";

export default function AliveCheckPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { address, isConnected } = useAccount();
  const { signAlive, isPending, isSuccess, hash } = useSignAlive();
  const [dbStatus, setDbStatus] = useState<"idle" | "syncing" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const dbSynced = useRef(false);

  // After on-chain signAlive confirms, sync the DB alive check record
  useEffect(() => {
    if (!isSuccess || !hash || dbSynced.current) return;
    dbSynced.current = true;
    setDbStatus("syncing");

    fetch("/api/alive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((res) => {
        if (res.ok) {
          setDbStatus("done");
        } else {
          // On-chain confirmed — still show success even if DB sync fails
          setDbStatus("done");
        }
      })
      .catch(() => {
        setDbStatus("done"); // On-chain is source of truth
      });
  }, [isSuccess, hash, token]);

  const handleSignAlive = () => {
    if (!address) return;
    signAlive();
  };

  const isDone = isSuccess && dbStatus === "done";

  return (
    <div className="container mx-auto max-w-lg px-4 py-20">
      <Card>
        <CardHeader>
          <CardTitle>Alive Check</CardTitle>
          <CardDescription>
            Confirm you&apos;re alive by signing a transaction with your wallet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isConnected && (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                Connect the wallet associated with your will to continue.
              </p>
              <ConnectButton />
            </div>
          )}

          {isConnected && !isDone && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Connected: <code>{address?.slice(0, 6)}...{address?.slice(-4)}</code>
              </p>
              <Button
                onClick={handleSignAlive}
                className="w-full"
                size="lg"
                disabled={isPending || dbStatus === "syncing"}
              >
                {isPending
                  ? "Confirm in wallet..."
                  : dbStatus === "syncing"
                  ? "Recording confirmation..."
                  : "Sign \"I Am Alive\""}
              </Button>
              {errorMsg && <p className="text-sm text-destructive text-center">{errorMsg}</p>}
            </div>
          )}

          {isDone && (
            <div className="text-center space-y-2">
              <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                ✓ Confirmed! You&apos;re alive.
              </p>
              <p className="text-sm text-muted-foreground">
                Your will timer has been reset. See you next month!
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
