"use client";

import { createConfig, http, WagmiProvider } from "wagmi";
import { polygon } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Define the Amoy testnet chain
const amoy = {
  id: 80002,
  name: 'Polygon Amoy',
  network: 'amoy',
  nativeCurrency: {
    decimals: 18,
    name: 'POL',  
    symbol: 'POL', 
  },
  rpcUrls: {
    public: { http: ['https://rpc-amoy.polygon.technology'] },
    default: { http: ['https://rpc-amoy.polygon.technology'] },
  },
  blockExplorers: {
    etherscan: { name: 'PolygonScan', url: 'https://amoy.polygonscan.com' },
    default: { name: 'PolygonScan', url: 'https://amoy.polygonscan.com' },
  },
} as const;

// Create a client
const queryClient = new QueryClient();

// Create wagmi config
const config = createConfig({
  chains: [amoy, polygon],
  transports: {
    [amoy.id]: http(),
    [polygon.id]: http(),
  },
  connectors: [
    injected(),
  ],
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}