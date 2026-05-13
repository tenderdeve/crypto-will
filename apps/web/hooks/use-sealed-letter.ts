"use client";

import { useState, useCallback } from "react";
import { useAccount } from "wagmi";
import type { SealedLetter } from "@/lib/db/types";

interface UseSealedLetterReturn {
  letter: SealedLetter | null;
  isLoading: boolean;
  error: string | null;
  fetchLetter: (willId: string) => Promise<void>;
  saveLetter: (
    willId: string,
    payload: {
      encryptedContent: string;
      iv: string;
      salt: string;
      contentHash: string;
    }
  ) => Promise<boolean>;
  isSaving: boolean;
}

export function useSealedLetter(): UseSealedLetterReturn {
  const { address } = useAccount();
  const [letter, setLetter] = useState<SealedLetter | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLetter = useCallback(
    async (willId: string) => {
      if (!address) return;
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/will/${willId}/sealed-letter`, {
          headers: { "x-wallet-address": address },
        });

        if (res.status === 404) {
          setLetter(null);
          return;
        }

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to fetch sealed letter");
        }

        const data = await res.json();
        setLetter(data.letter);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    },
    [address]
  );

  const saveLetter = useCallback(
    async (
      willId: string,
      payload: {
        encryptedContent: string;
        iv: string;
        salt: string;
        contentHash: string;
      }
    ): Promise<boolean> => {
      if (!address) return false;
      setIsSaving(true);
      setError(null);

      try {
        const res = await fetch(`/api/will/${willId}/sealed-letter`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-wallet-address": address,
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to save sealed letter");
        }

        const data = await res.json();
        setLetter(data.letter);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [address]
  );

  return { letter, isLoading, error, fetchLetter, saveLetter, isSaving };
}
