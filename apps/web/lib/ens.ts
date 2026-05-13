import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";

/**
 * Standalone Ethereum mainnet client for ENS resolution.
 * ENS names live on L1 — this is separate from the Base chain wagmi config.
 */
export const mainnetClient = createPublicClient({
  chain: mainnet,
  transport: http(process.env.NEXT_PUBLIC_MAINNET_RPC_URL || undefined),
});
