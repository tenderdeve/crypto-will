import { z } from "zod";

const ethAddress = z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address");

export const createWillSchema = z.object({
  beneficiaryAddress: ethAddress,
  tokenAddresses: z.array(ethAddress).min(1).max(50),
  gracePeriodDays: z.number().int().min(30).max(180),
  contractTxHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Invalid tx hash"),
  email: z.string().email().optional(),
});

export const aliveCheckSchema = z.object({
  signature: z.string().min(1),
  willId: z.string().uuid(),
});

export const walletAuthSchema = z.object({
  message: z.string().min(1),
  signature: z.string().min(1),
});

export const sealedLetterSchema = z.object({
  encryptedContent: z.string().min(1, "Encrypted content is required"),
  iv: z.string().min(1, "IV is required"),
  salt: z.string().min(1, "Salt is required"),
  contentHash: z.string().min(1, "Content hash is required"),
});

export type CreateWillInput = z.infer<typeof createWillSchema>;
export type AliveCheckInput = z.infer<typeof aliveCheckSchema>;
export type WalletAuthInput = z.infer<typeof walletAuthSchema>;
export type SealedLetterInput = z.infer<typeof sealedLetterSchema>;
