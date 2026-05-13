"use client";

import { useState, useEffect } from "react";
import { Lock, Eye, EyeOff, AlertTriangle, Check, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useSealedLetter } from "@/hooks/use-sealed-letter";
import { encryptLetter, decryptLetter } from "@/lib/crypto/sealed-letter";

const MAX_PLAINTEXT_BYTES = 10 * 1024; // 10 KB

type Mode = "write" | "preview";

export function SealedLetterDialog({
  willId,
  open,
  onOpenChange,
}: {
  willId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { letter, isLoading, error, fetchLetter, saveLetter, isSaving } =
    useSealedLetter();

  const [mode, setMode] = useState<Mode>("write");
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [decryptedMessage, setDecryptedMessage] = useState<string | null>(null);
  const [decryptError, setDecryptError] = useState<string | null>(null);
  const [decryptPassword, setDecryptPassword] = useState("");
  const [saved, setSaved] = useState(false);

  // Load existing letter when dialog opens
  useEffect(() => {
    if (open && willId) {
      fetchLetter(willId);
      // Reset state
      setMessage("");
      setPassword("");
      setConfirmPassword("");
      setDecryptedMessage(null);
      setDecryptError(null);
      setDecryptPassword("");
      setSaved(false);
    }
  }, [open, willId, fetchLetter]);

  // Switch to preview mode if letter exists
  useEffect(() => {
    if (letter) {
      setMode("preview");
    } else {
      setMode("write");
    }
  }, [letter]);

  const messageBytes = new TextEncoder().encode(message).length;
  const overLimit = messageBytes > MAX_PLAINTEXT_BYTES;
  const passwordsMatch = password === confirmPassword;
  const passwordLongEnough = password.length >= 8;
  const canSave =
    message.trim().length > 0 &&
    !overLimit &&
    passwordsMatch &&
    passwordLongEnough &&
    !isSaving;

  const handleEncryptAndSave = async () => {
    if (!canSave) return;
    setSaved(false);

    const encrypted = await encryptLetter(message, password);

    const success = await saveLetter(willId, {
      encryptedContent: encrypted.ciphertext,
      iv: encrypted.iv,
      salt: encrypted.salt,
      contentHash: encrypted.hash,
    });

    if (success) {
      setSaved(true);
      setMessage("");
      setPassword("");
      setConfirmPassword("");
    }
  };

  const handleDecrypt = async () => {
    if (!letter || !decryptPassword) return;
    setDecryptError(null);

    try {
      const plaintext = await decryptLetter(
        letter.encrypted_content,
        letter.iv,
        letter.salt,
        decryptPassword,
        letter.content_hash
      );
      setDecryptedMessage(plaintext);
    } catch {
      setDecryptError("Wrong password or corrupted data.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-bg border-line max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="serif text-2xl flex items-center gap-2">
            <Lock className="w-5 h-5 text-accent" />
            Sealed Letter
          </DialogTitle>
          <DialogDescription className="text-ink-3 text-[13px]">
            An encrypted message only your beneficiary can read — with the
            password you share with them.
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-ink-3 animate-spin" />
          </div>
        )}

        {!isLoading && mode === "preview" && letter && (
          <div className="space-y-4">
            <div className="p-4 rounded-inputs bg-paper border border-line">
              <div className="text-[11px] tracking-[0.14em] uppercase text-ink-3 mb-2">
                Encrypted letter saved
              </div>
              <div className="text-[13px] text-ink-2 leading-relaxed">
                Your letter is stored encrypted. Enter your password below to
                preview it, or click &ldquo;Write new&rdquo; to replace it.
              </div>
              <div className="text-[11px] text-ink-3 mt-2">
                Last updated:{" "}
                {new Date(letter.updated_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </div>
            </div>

            {/* Decrypt preview */}
            {!decryptedMessage && (
              <div className="space-y-2">
                <label className="text-[13px] text-ink-2 font-medium">
                  Password to preview
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={decryptPassword}
                    onChange={(e) => setDecryptPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="flex-1 px-3 py-2.5 rounded-inputs border border-line bg-paper text-[15px] outline-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleDecrypt();
                    }}
                  />
                  <button
                    onClick={handleDecrypt}
                    disabled={!decryptPassword}
                    className="rounded-pill bg-ink text-paper px-4 py-2 text-[13px] font-medium cursor-pointer border-none disabled:opacity-50"
                  >
                    Decrypt
                  </button>
                </div>
                {decryptError && (
                  <p className="text-xs text-danger">{decryptError}</p>
                )}
              </div>
            )}

            {decryptedMessage && (
              <div className="p-4 rounded-inputs bg-paper border border-good/30">
                <div className="text-[11px] tracking-[0.14em] uppercase text-good mb-2">
                  Decrypted preview
                </div>
                <div className="text-[14px] text-ink leading-relaxed whitespace-pre-wrap break-words">
                  {decryptedMessage}
                </div>
              </div>
            )}

            <button
              onClick={() => {
                setMode("write");
                setDecryptedMessage(null);
                setDecryptPassword("");
                setDecryptError(null);
                setSaved(false);
              }}
              className="bg-transparent border border-line text-ink-2 px-4 py-2 rounded-pill text-[13px] cursor-pointer hover:border-ink hover:text-ink"
            >
              Write new letter
            </button>
          </div>
        )}

        {!isLoading && mode === "write" && (
          <div className="space-y-4">
            {/* Warning banner */}
            <div className="flex items-start gap-2.5 p-3 rounded-inputs bg-warn/10 border border-warn/20 text-[13px] text-ink-2 leading-relaxed">
              <AlertTriangle className="w-4 h-4 text-warn shrink-0 mt-0.5" />
              <span>
                You must share the password with your beneficiary out-of-band
                (e.g. in person, secure messenger). Without it, they cannot read
                this letter.
              </span>
            </div>

            {/* Message textarea */}
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <label className="text-[13px] text-ink-2 font-medium">
                  Your message
                </label>
                <span
                  className={`text-[11px] ${
                    overLimit ? "text-danger" : "text-ink-3"
                  }`}
                >
                  {(messageBytes / 1024).toFixed(1)} / 10 KB
                </span>
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write something meaningful for your beneficiary..."
                rows={6}
                className="w-full px-3.5 py-3 rounded-inputs border border-line bg-paper text-[15px] outline-none resize-y leading-relaxed"
              />
              {overLimit && (
                <p className="text-xs text-danger mt-1">
                  Message exceeds 10 KB limit.
                </p>
              )}
            </div>

            {/* Password fields */}
            <div className="grid gap-3">
              <div>
                <label className="text-[13px] text-ink-2 font-medium mb-1.5 block">
                  Encryption password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full px-3 py-2.5 rounded-inputs border border-line bg-paper text-[15px] outline-none pr-10"
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
                {password && !passwordLongEnough && (
                  <p className="text-xs text-danger mt-1">
                    Password must be at least 8 characters.
                  </p>
                )}
              </div>
              <div>
                <label className="text-[13px] text-ink-2 font-medium mb-1.5 block">
                  Confirm password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full px-3 py-2.5 rounded-inputs border border-line bg-paper text-[15px] outline-none"
                />
                {confirmPassword && !passwordsMatch && (
                  <p className="text-xs text-danger mt-1">
                    Passwords do not match.
                  </p>
                )}
              </div>
            </div>

            {/* Save button */}
            <button
              onClick={handleEncryptAndSave}
              disabled={!canSave}
              className="w-full rounded-pill bg-ink text-paper py-3 text-[15px] font-medium cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Encrypting & saving...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Encrypt & save letter
                </>
              )}
            </button>

            {saved && (
              <p className="text-sm text-good flex items-center gap-1.5">
                <Check className="w-4 h-4" />
                Letter encrypted and saved.
              </p>
            )}

            {error && (
              <p className="text-xs text-danger">
                {error}
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
