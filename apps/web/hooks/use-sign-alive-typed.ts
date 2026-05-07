"use client";

import { useState } from "react";
import { useAccount, useReadContract, useSignTypedData } from "wagmi";
import { CRYPTO_WILL_ABI, CRYPTO_WILL_ADDRESS } from "@/lib/contracts";

const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || "8453");

const domain = {
  name: "ChainWill",
  version: "1",
  chainId: CHAIN_ID,
  verifyingContract: CRYPTO_WILL_ADDRESS,
} as const;

const types = {
  AliveProof: [
    { name: "owner", type: "address" },
    { name: "nonce", type: "uint256" },
    { name: "issuedAt", type: "uint256" },
  ],
} as const;

export function useSignAliveTyped() {
  const { address } = useAccount();
  const [status, setStatus] = useState<"idle" | "signing" | "relaying" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const { data: nonce } = useReadContract({
    address: CRYPTO_WILL_ADDRESS,
    abi: CRYPTO_WILL_ABI,
    functionName: "aliveNonce",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { signTypedDataAsync } = useSignTypedData();

  const signAliveGasless = async () => {
    if (!address || nonce === undefined) return;
    setStatus("signing");
    setError(null);

    try {
      const issuedAt = BigInt(Math.floor(Date.now() / 1000));
      const message = { owner: address, nonce, issuedAt };

      const signature = await signTypedDataAsync({
        domain,
        types,
        primaryType: "AliveProof",
        message,
      });

      setStatus("relaying");

      const res = await fetch("/api/alive/relay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: address,
          nonce: nonce.toString(),
          issuedAt: issuedAt.toString(),
          signature,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Relay failed");
      }

      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Signing failed");
    }
  };

  return {
    signAliveGasless,
    status,
    isPending: status === "signing" || status === "relaying",
    isSuccess: status === "done",
    error,
    nonce,
  };
}
