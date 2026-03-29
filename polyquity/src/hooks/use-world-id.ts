import { useState, useEffect, useCallback } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { useQueryClient } from '@tanstack/react-query'
import { type IDKitResult, type RpContext } from '@worldcoin/idkit'
import {
  getWorldIdRpSignature,
  verifyWorldIdProof,
} from 'server/functions/world-id'
import { recordKycVerification } from 'server/functions/kyc'
import { registerUser } from 'server/functions/users'

interface UseWorldIdOptions {
  signal?: string
  onSuccess?: () => void
  onError?: (errorCode: string) => void
}

export interface UseWorldIdReturn {
  verify: () => void
  reset: () => void
  isLoading: boolean
  isAwaitingConfirmation: boolean
  isVerified: boolean
  error: string | null
  signal?: string
  rpContext: RpContext | null
  widgetOpen: boolean
  setWidgetOpen: (open: boolean) => void
  handleVerify: (proof: IDKitResult) => Promise<void>
  handleSuccess: (proof: IDKitResult) => Promise<void>
}

export function useWorldId({
  signal,
  onSuccess,
  onError,
}: UseWorldIdOptions): UseWorldIdReturn {
  const queryClient = useQueryClient()

  const [rpContext, setRpContext] = useState<RpContext | null>(null)
  const [widgetOpen, setWidgetOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isAwaitingConfirmation, setIsAwaitingConfirmation] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getSignatureFn = useServerFn(getWorldIdRpSignature)
  const verifyProofFn = useServerFn(verifyWorldIdProof)
  const recordKycFn = useServerFn(recordKycVerification)
  const registerUserFn = useServerFn(registerUser)

  useEffect(() => {
    let isMounted = true
    setIsLoading(true)

    getSignatureFn({ data: { action: 'kyc-verify' } })
      .then((res) => {
        if (isMounted) {
          setRpContext(res.rp_context as RpContext)
          setIsLoading(false)
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Failed to fetch RP context:', err)
          setError('Failed to connect to World Network')
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [getSignatureFn])

  const verify = useCallback(() => {
    if (!rpContext) return
    setWidgetOpen(true)
  }, [rpContext])

  const reset = useCallback(() => {
    setError(null)
    setIsVerified(false)
    setIsAwaitingConfirmation(false)
  }, [])

  const handleVerify = useCallback(
    async (proof: IDKitResult) => {
      if (!signal) throw new Error('Wallet not connected')
      setIsAwaitingConfirmation(true)

      const result = (await verifyProofFn({
        data: {
          rp_id: import.meta.env.VITE_WORLD_RP_ID || '',
          idkitResponse: proof as unknown as Record<string, unknown>,
        },
      })) as { success: boolean }

      if (!result.success) {
        throw new Error('ZK proof validation failed')
      }
    },
    [signal, verifyProofFn],
  )

  const handleSuccess = useCallback(
    async (proof: IDKitResult) => {
      if (!signal) return
      setIsAwaitingConfirmation(false)

      try {
        await registerUserFn({
          data: { walletAddress: signal, role: 'investor' },
        })

        const mockTxHash = '0xMockHashWaitUntilSmartContractIsReady...'

        await recordKycFn({
          data: {
            walletAddress: signal,
            txHash: mockTxHash,
            chainId: 43113,
            // @ts-expect-error — proof shape differs between v3 legacy and v4
            signature: proof.responses?.[0]?.proof || 'mock-signature',
          },
        })

        // Invalidate so AuthGuard re-checks KYC status
        await queryClient.invalidateQueries({
          queryKey: ['kyc-status', signal],
        })

        setIsVerified(true)
        onSuccess?.()
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Verification failed'
        setError(msg)
        onError?.(msg)
      }
    },
    [signal, registerUserFn, recordKycFn, queryClient, onSuccess, onError],
  )

  return {
    verify,
    reset,
    isLoading,
    isAwaitingConfirmation,
    isVerified,
    error,
    signal,
    rpContext,
    widgetOpen,
    setWidgetOpen,
    handleVerify,
    handleSuccess,
  }
}
