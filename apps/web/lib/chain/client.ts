import { createPublicClient, createWalletClient, http } from "viem";
import { baseSepolia, localhost } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

function getChain() {
  const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "84532");
  return chainId === 31337 ? localhost : baseSepolia;
}

export function getPublicClient() {
  return createPublicClient({
    chain: getChain(),
    transport: http(process.env.BASE_RPC_URL),
  });
}

export function getWalletClient() {
  const privateKey = process.env.EXECUTOR_PRIVATE_KEY as `0x${string}`;
  const account = privateKeyToAccount(privateKey);

  return createWalletClient({
    account,
    chain: getChain(),
    transport: http(process.env.BASE_RPC_URL),
  });
}
