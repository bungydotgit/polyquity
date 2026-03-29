import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface WalletConnectButtonProps {
  /** Makes buttons full-width (for mobile menus) */
  fullWidth?: boolean
  /** Additional className */
  className?: string
}

/**
 * Custom-styled RainbowKit connect button.
 *
 * - Disconnected → gradient "Connect Wallet" button
 * - Wrong network → destructive "Wrong Network" button
 * - Connected → chain selector + account display name
 */
export function WalletConnectButton({
  fullWidth = false,
  className,
}: WalletConnectButtonProps) {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const connected = mounted && account && chain

        return (
          <div
            className={cn(fullWidth && 'w-full', className)}
            {...(!mounted && {
              'aria-hidden': true,
              style: {
                opacity: 0,
                pointerEvents: 'none' as const,
                userSelect: 'none' as const,
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <Button
                    size="lg"
                    onClick={openConnectModal}
                    className={cn(
                      'bg-gradient-primary text-on-primary rounded-xl font-semibold shadow-ambient hover:opacity-90',
                      fullWidth && 'w-full',
                    )}
                  >
                    Connect Wallet
                  </Button>
                )
              }

              if (chain.unsupported) {
                return (
                  <Button
                    size="lg"
                    variant="destructive"
                    onClick={openChainModal}
                    className={cn(
                      'rounded-xl font-semibold',
                      fullWidth && 'w-full',
                    )}
                  >
                    Wrong Network
                  </Button>
                )
              }

              return (
                <div
                  className={cn(
                    'flex items-center gap-2',
                    fullWidth && 'w-full',
                  )}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openChainModal}
                    className={cn(
                      'rounded-xl border-ghost text-on-surface-variant hover:bg-surface-container-low gap-1.5',
                      fullWidth && 'flex-1',
                    )}
                  >
                    {chain.hasIcon && chain.iconUrl && (
                      <img
                        alt={chain.name ?? 'Chain'}
                        src={chain.iconUrl}
                        className="size-4 rounded-full"
                      />
                    )}
                    {chain.name}
                  </Button>
                  <Button
                    size="sm"
                    onClick={openAccountModal}
                    className={cn(
                      'bg-gradient-primary text-on-primary rounded-xl font-semibold shadow-ambient hover:opacity-90',
                      fullWidth && 'flex-1',
                    )}
                  >
                    {account.displayName}
                  </Button>
                </div>
              )
            })()}
          </div>
        )
      }}
    </ConnectButton.Custom>
  )
}
