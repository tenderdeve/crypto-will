"use client";

import { useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { use } from "react";

export default function AliveCheckPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [status, setStatus] = useState<"idle" | "signing" | "confirming" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSignAlive = async () => {
    if (!address) return;

    try {
      setStatus("signing");
      const message = `CryptoWill Alive Check\nToken: ${token}\nTimestamp: ${Date.now()}`;
      const signature = await signMessageAsync({ message });

      setStatus("confirming");

      // POST to API (we'd need the willId - for now use token-based lookup)
      const res = await fetch("/api/alive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature, token }),
      });

      if (res.ok) {
        setStatus("success");
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Failed to confirm");
        setStatus("error");
      }
    } catch (err) {
      setErrorMsg("Signature rejected or failed");
      setStatus("error");
    }
  };

  return (
    <div className="container mx-auto max-w-lg px-4 py-20">
      <Card>
        <CardHeader>
          <CardTitle>Alive Check</CardTitle>
          <CardDescription>
            Confirm you&apos;re alive by signing a message with your wallet.
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

          {isConnected && status === "idle" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Connected: <code>{address?.slice(0, 6)}...{address?.slice(-4)}</code>
              </p>
              <Button onClick={handleSignAlive} className="w-full" size="lg">
                Sign &quot;I Am Alive&quot;
              </Button>
            </div>
          )}

          {status === "signing" && (
            <p className="text-center text-muted-foreground">
              Please sign the message in your wallet...
            </p>
          )}

          {status === "confirming" && (
            <p className="text-center text-muted-foreground">
              Confirming with server...
            </p>
          )}

          {status === "success" && (
            <div className="text-center space-y-2">
              <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                ✓ Confirmed! You&apos;re alive.
              </p>
              <p className="text-sm text-muted-foreground">
                Your will timer has been reset. See you next month!
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="text-center space-y-4">
              <p className="text-destructive">{errorMsg}</p>
              <Button onClick={() => setStatus("idle")} variant="outline">
                Try Again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
