"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { http, defineChain } from "viem";
import { base, baseSepolia } from "wagmi/chains";
import { RainbowKitProvider, getDefaultConfig, type Theme, lightTheme } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { type ReactNode, useState } from "react";

const anvil = defineChain({
  id: 1337,
  name: "Localhost",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["http://127.0.0.1:8545"] },
  },
});

const config = getDefaultConfig({
  appName: "ChainWill",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo",
  chains: [anvil, baseSepolia, base],
  transports: {
    [anvil.id]: http("http://127.0.0.1:8545"),
    [baseSepolia.id]: http(),
    [base.id]: http(),
  },
  ssr: true,
});

const chainWillTheme: Theme = {
  ...lightTheme({
    accentColor: "#221d17",
    accentColorForeground: "#faf5ec",
    borderRadius: "large",
  }),
  colors: {
    ...lightTheme().colors,
    accentColor: "#221d17",
    accentColorForeground: "#faf5ec",
    connectButtonBackground: "#faf5ec",
    connectButtonText: "#221d17",
    modalBackground: "#faf5ec",
    modalText: "#221d17",
    modalTextSecondary: "#4a423a",
    modalBorder: "#d9cfbe",
    profileForeground: "#faf5ec",
    generalBorder: "#d9cfbe",
    generalBorderDim: "#e6dcc9",
    menuItemBackground: "#ebe1d2",
    actionButtonBorder: "#d9cfbe",
    actionButtonSecondaryBackground: "#ebe1d2",
    closeButton: "#80766a",
    closeButtonBackground: "#ebe1d2",
  },
  fonts: {
    body: "var(--font-sans), Inter Tight, system-ui, sans-serif",
  },
};

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={chainWillTheme}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
