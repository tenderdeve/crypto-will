import { createPublicClient, createWalletClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

export function getPublicClient() {
  return createPublicClient({
    chain: baseSepolia,
    transport: http(process.env.BASE_RPC_URL),
  });
}

export function getWalletClient() {
  const privateKey = process.env.EXECUTOR_PRIVATE_KEY as `0x${string}`;
  const account = privateKeyToAccount(privateKey);

  return createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(process.env.BASE_RPC_URL),
  });
}
