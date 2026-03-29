import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getIPOs, getIPO, recordIPO } from '../../server/functions/ipos'
import {
  getCompanyByWallet,
  registerCompany,
} from '../../server/functions/companies'
import { uploadToIPFS, uploadJsonToIPFS } from '../../server/functions/ipfs'

// ─── IPO queries ─────────────────────────────────────────────────────────────

export function useIPOs(params?: {
  status?: 'upcoming' | 'active' | 'finalized' | 'cancelled'
  page?: number
  limit?: number
}) {
  return useQuery({
    queryKey: ['ipos', params],
    queryFn: () =>
      getIPOs({
        data: {
          status: params?.status,
          page: params?.page,
          limit: params?.limit,
        },
      }),
  })
}

export function useIPO(contractAddress: string | undefined) {
  return useQuery({
    queryKey: ['ipo', contractAddress],
    queryFn: () => getIPO({ data: { contractAddress: contractAddress! } }),
    enabled: !!contractAddress,
  })
}

// ─── Company queries ─────────────────────────────────────────────────────────

export function useCompany(walletAddress: string | undefined) {
  return useQuery({
    queryKey: ['company', walletAddress],
    queryFn: () =>
      getCompanyByWallet({ data: { walletAddress: walletAddress! } }),
    enabled: !!walletAddress,
  })
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export function useRegisterCompany() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      ownerWallet: string
      name: string
      description?: string
      registrationNumber?: string
      website?: string
    }) => registerCompany({ data }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['company', variables.ownerWallet],
      })
    },
  })
}

export function useRecordIPO() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      contractAddress: string
      issuerWallet: string
      companyId?: string
      tokenName: string
      tokenSymbol: string
      ipfsDocCid?: string
      startTime: string
      endTime: string
      pricePerToken: string
      totalTokens: string
    }) => recordIPO({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ipos'] })
    },
  })
}

export function useUploadToIPFS() {
  return useMutation({
    mutationFn: (data: {
      fileBase64: string
      fileName: string
      mimeType: string
      metadata?: Record<string, string>
    }) => uploadToIPFS({ data }),
  })
}

export function useUploadJsonToIPFS() {
  return useMutation({
    mutationFn: (data: { jsonData: Record<string, unknown>; name: string }) =>
      uploadJsonToIPFS({ data }),
  })
}
