"use client";

import { useState } from "react";
import { Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAccount } from "wagmi";
import { decryptLetter } from "@/lib/crypto/sealed-letter";
import type { SealedLetter } from "@/lib/db/types";

export function SealedLetterReveal({
  willId,
}: {
  willId: string;
}) {
  const { address } = useAccount();
  const [letter, setLetter] = useState<SealedLetter | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [plaintext, setPlaintext] = useState<string | null>(null);
  const [decryptError, setDecryptError] = useState<string | null>(null);

  const handleFetch = async () => {
    if (!address) return;
    setIsLoading(true);
    setFetchError(null);

    try {
      const res = await fetch(`/api/will/${willId}/sealed-letter`, {
        headers: { "x-wallet-address": address },
      });

      if (res.status === 404) {
        setFetchError("No sealed letter was left for this will.");
        setFetched(true);
        return;
      }

      if (res.status === 403) {
        const data = await res.json();
        setFetchError(data.error || "You do not have access to this letter.");
        setFetched(true);
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to fetch sealed letter.");
      }

      const data = await res.json();
      setLetter(data.letter);
      setFetched(true);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Unknown error");
      setFetched(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecrypt = async () => {
    if (!letter || !password) return;
    setDecryptError(null);

    try {
      const text = await decryptLetter(
        letter.encrypted_content,
        letter.iv,
        letter.salt,
        password,
        letter.content_hash
      );
      setPlaintext(text);
    } catch {
      setDecryptError("Wrong password or corrupted data.");
    }
  };

  // Not yet fetched — show teaser
  if (!fetched) {
    return (
      <div className="p-6 rounded-cards bg-bg-2 border border-line">
        <div className="flex items-center gap-2 mb-3">
          <Lock className="w-4 h-4 text-accent" />
          <div className="text-[11px] tracking-[0.14em] uppercase text-ink-3">
            Sealed letter
          </div>
        </div>
        <p className="text-[13px] text-ink-2 leading-relaxed mb-4">
          The owner of this will may have left an encrypted message for you.
          You will need the password they shared with you to decrypt it.
        </p>
        <button
          onClick={handleFetch}
          disabled={isLoading || !address}
          className="rounded-pill bg-ink text-paper px-4 py-2.5 text-[13px] font-medium cursor-pointer border-none disabled:opacity-50 flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              Check for sealed letter
            </>
          )}
        </button>
        {fetchError && (
          <p className="text-xs text-danger mt-3">{fetchError}</p>
        )}
      </div>
    );
  }

  // Fetched but no letter exists
  if (!letter) {
    return (
      <div className="p-6 rounded-cards bg-bg-2 border border-line">
        <div className="flex items-center gap-2 mb-2">
          <Lock className="w-4 h-4 text-ink-3" />
          <div className="text-[11px] tracking-[0.14em] uppercase text-ink-3">
            Sealed letter
          </div>
        </div>
        <p className="text-[13px] text-ink-3">
          {fetchError || "No sealed letter was left for this will."}
        </p>
      </div>
    );
  }

  // Letter exists, show decrypt UI or plaintext
  return (
    <div className="p-6 rounded-cards bg-bg-2 border border-line">
      <div className="flex items-center gap-2 mb-3">
        <Lock className="w-4 h-4 text-accent" />
        <div className="text-[11px] tracking-[0.14em] uppercase text-ink-3">
          Sealed letter
        </div>
      </div>

      {!plaintext ? (
        <div className="space-y-3">
          <p className="text-[13px] text-ink-2 leading-relaxed">
            An encrypted letter was left for you. Enter the password to decrypt
            it.
          </p>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter the password"
              className="w-full px-3 py-2.5 rounded-inputs border border-line bg-paper text-[15px] outline-none pr-10"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleDecrypt();
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-ink-3 cursor-pointer"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          <button
            onClick={handleDecrypt}
            disabled={!password}
            className="rounded-pill bg-ink text-paper px-4 py-2.5 text-[13px] font-medium cursor-pointer border-none disabled:opacity-50"
          >
            Decrypt letter
          </button>
          {decryptError && (
            <p className="text-xs text-danger">{decryptError}</p>
          )}
        </div>
      ) : (
        <div className="p-4 rounded-inputs bg-paper border border-good/30">
          <div className="text-[11px] tracking-[0.14em] uppercase text-good mb-2">
            Decrypted message
          </div>
          <div className="text-[15px] text-ink leading-relaxed whitespace-pre-wrap break-words">
            {plaintext}
          </div>
        </div>
      )}
    </div>
  );
}
