import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { RainbowKitProvider, lightTheme } from '@rainbow-me/rainbowkit'

import '@rainbow-me/rainbowkit/styles.css'
import appCss from '../styles.css?url'
import { config } from '../lib/wagmi'
import { queryClient } from '../lib/react-query'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Polyquity — Institutional-Grade Tokenized Equity Platform' },
      {
        name: 'description',
        content:
          'Polyquity is the compliance-first platform for Web3 Initial Public Offerings. Verified investors, immutable cap tables, and seamless capital formation.',
      },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap',
      },
    ],
  }),

  shellComponent: RootDocument,
  component: () => <Outlet />,
})

const polyquityTheme = lightTheme({
  accentColor: '#004ac6',
  accentColorForeground: '#ffffff',
  borderRadius: 'large',
  fontStack: 'system',
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <RainbowKitProvider
              theme={polyquityTheme}
              appInfo={{
                appName: 'Polyquity',
                learnMoreUrl: 'https://polyquity.io',
              }}
            >
              {children}
            </RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
        <Scripts />
      </body>
    </html>
  )
}
