import { z } from "zod";

const ethAddress = z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address");

export const createWillSchema = z.object({
  beneficiaryAddress: ethAddress,
  tokenAddresses: z.array(ethAddress).min(1).max(50),
  gracePeriodDays: z.number().int().min(30).max(180),
  contractTxHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Invalid tx hash"),
  email: z.string().email().optional(),
  beneficiaryEmail: z.string().email().optional(),
  contractWillId: z.number().int().min(0).optional(),
  contractVersion: z.number().int().min(1).max(2).optional(),
});

export const aliveCheckSchema = z.object({
  signature: z.string().min(1),
  willId: z.string().uuid(),
});

export const walletAuthSchema = z.object({
  message: z.string().min(1),
  signature: z.string().min(1),
});

// Base64 pattern (standard, no whitespace)
const base64 = z.string().regex(/^[A-Za-z0-9+/]+=*$/, "Invalid base64");

export const sealedLetterSchema = z.object({
  // 10 KB plaintext -> ~10,256 bytes ciphertext (+ 16-byte GCM tag) -> ~13,676 base64 chars; cap at 14,000
  encryptedContent: base64.min(1, "Encrypted content is required").max(14_000, "Encrypted content too large"),
  // 12-byte IV -> 16 base64 chars
  iv: base64.min(1, "IV is required").max(24, "IV too large"),
  // 16-byte salt -> 24 base64 chars
  salt: base64.min(1, "Salt is required").max(24, "Salt too large"),
  // SHA-256 digest -> 32 bytes -> 44 base64 chars
  contentHash: base64.min(1, "Content hash is required").max(44, "Content hash too large"),
});

export type CreateWillInput = z.infer<typeof createWillSchema>;
export type AliveCheckInput = z.infer<typeof aliveCheckSchema>;
export type WalletAuthInput = z.infer<typeof walletAuthSchema>;
export type SealedLetterInput = z.infer<typeof sealedLetterSchema>;
