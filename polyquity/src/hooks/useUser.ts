import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getUser, registerUser, updateUser } from '../../server/functions/users'
import { getKycStatus, recordKycVerification } from '../../server/functions/kyc'

// ─── User queries ────────────────────────────────────────────────────────────

export function useUser(walletAddress: string | undefined) {
  return useQuery({
    queryKey: ['user', walletAddress],
    queryFn: () => getUser({ data: { walletAddress: walletAddress! } }),
    enabled: !!walletAddress,
  })
}

export function useKycStatus(walletAddress: string | undefined) {
  return useQuery({
    queryKey: ['kyc-status', walletAddress],
    queryFn: () => getKycStatus({ data: { walletAddress: walletAddress! } }),
    enabled: !!walletAddress,
  })
}

// ─── User mutations ──────────────────────────────────────────────────────────

export function useRegisterUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      walletAddress: string
      displayName?: string
      email?: string
      role: 'investor' | 'issuer'
    }) => registerUser({ data }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['user', variables.walletAddress],
      })
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      walletAddress: string
      displayName?: string
      email?: string
    }) => updateUser({ data }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['user', variables.walletAddress],
      })
    },
  })
}

export function useRecordKyc() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      walletAddress: string
      txHash: string
      chainId: number
      signature: string
    }) => recordKycVerification({ data }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['kyc-status', variables.walletAddress],
      })
      queryClient.invalidateQueries({
        queryKey: ['user', variables.walletAddress],
      })
    },
  })
}
