import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { http } from 'wagmi'
import { anvil, avalanche, avalancheFuji } from 'wagmi/chains'

export const config = getDefaultConfig({
  appName: 'Polyquity',
  appDescription:
    'Institutional-grade tokenized equity platform for Web3 IPOs.',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
  chains: [avalancheFuji, avalanche, anvil],
  transports: {
    // Route RPC requests through the Vite Dev Server proxy to bypass CORS
    [avalancheFuji.id]: http('/api/rpc/avalancheFuji'),
    [avalanche.id]: http('/api/rpc/avalanche'),
    [anvil.id]: http('http://127.0.0.1:8545'),
  },
})

// Register config for strong TypeScript inference across the app
declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
