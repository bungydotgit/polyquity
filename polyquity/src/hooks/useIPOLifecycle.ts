import { useEffect, useState } from 'react'
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi'
import { parseEther } from 'viem'
import { POLY_IPO_ABI } from '@/lib/constants'

export function useIPOLifecycle(ipoAddress: string) {
  const { address } = useAccount()
  const [txHash, setTxHash] = useState<`0x${string}`>()

  // --- READS ---
  const { data: effectiveState, refetch: refetchState } = useReadContract({
    address: ipoAddress as `0x${string}`,
    abi: POLY_IPO_ABI,
    functionName: 'getEffectiveState',
    query: { refetchInterval: 3000 },
  })

  const { data: liveTotalRaised, refetch: refetchRaised } = useReadContract({
    address: ipoAddress as `0x${string}`,
    abi: POLY_IPO_ABI,
    functionName: 's_totalRaised',
    query: { refetchInterval: 3000 },
  })

  const { data: contributionStr, refetch: refetchContrib } = useReadContract({
    address: ipoAddress as `0x${string}`,
    abi: POLY_IPO_ABI,
    functionName: 's_contributions',
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 3000 },
  })

  const { data: claimableTokensStr, refetch: refetchClaimable } =
    useReadContract({
      address: ipoAddress as `0x${string}`,
      abi: POLY_IPO_ABI,
      functionName: 'getClaimableTokens',
      args: address ? [address] : undefined,
      query: { enabled: !!address, refetchInterval: 3000 },
    })

  // Normalize reads
  const stateVal = effectiveState !== undefined ? (effectiveState as number) : 0
  const contribution =
    contributionStr !== undefined ? (contributionStr as bigint) : 0n
  const claimableTokens =
    claimableTokensStr !== undefined ? (claimableTokensStr as bigint) : 0n

  // --- WRITES ---
  const { writeContractAsync } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  // --- GLOBAL RE-FETCH ON SUCCESS ---
  useEffect(() => {
    if (isSuccess) {
      alert('Transaction Confirmed!')
      refetchState()
      refetchRaised()
      refetchContrib()
      refetchClaimable()
      setTxHash(undefined)
    }
  }, [isSuccess, refetchState, refetchRaised, refetchContrib, refetchClaimable])

  // --- ACTION HANDLERS ---
  const bid = async (amountEth: string) => {
    if (!amountEth || Number(amountEth) <= 0) {
      return alert('Please enter a valid ETH amount greater than 0')
    }
    try {
      const hash = await writeContractAsync({
        address: ipoAddress as `0x${string}`,
        abi: POLY_IPO_ABI,
        functionName: 'bid',
        value: parseEther(amountEth),
      })
      setTxHash(hash)
      return { success: true, hash }
    } catch (error: any) {
      console.error('💥 BID REVERTED:', error)
      alert(`Transaction Failed: ${error.shortMessage || error.message}`)
      return { success: false, error }
    }
  }

  const finalize = async () => {
    try {
      const hash = await writeContractAsync({
        address: ipoAddress as `0x${string}`,
        abi: POLY_IPO_ABI,
        functionName: 'finalize',
      })
      setTxHash(hash)
      return { success: true, hash }
    } catch (error: any) {
      console.error('💥 FINALIZE REVERTED:', error)
      alert(`Transaction Failed: ${error.shortMessage || error.message}`)
      return { success: false, error }
    }
  }

  const claimTokens = async () => {
    try {
      const hash = await writeContractAsync({
        address: ipoAddress as `0x${string}`,
        abi: POLY_IPO_ABI,
        functionName: 'claimTokens',
      })
      setTxHash(hash)
      return { success: true, hash }
    } catch (error: any) {
      console.error('💥 CLAIMTOKENS REVERTED:', error)
      alert(`Transaction Failed: ${error.shortMessage || error.message}`)
      return { success: false, error }
    }
  }

  const claimRefund = async () => {
    try {
      const hash = await writeContractAsync({
        address: ipoAddress as `0x${string}`,
        abi: POLY_IPO_ABI,
        functionName: 'claimRefund',
      })
      setTxHash(hash)
      return { success: true, hash }
    } catch (error: any) {
      console.error('💥 CLAIMREFUND REVERTED:', error)
      alert(`Transaction Failed: ${error.shortMessage || error.message}`)
      return { success: false, error }
    }
  }

  return {
    // State
    stateVal, // 0 = Active, 1 = Completed, 2 = Failed
    liveTotalRaised,
    contribution,
    claimableTokens,

    // Loading states
    isConfirming,
    isSuccess,

    // Actions
    bid,
    finalize,
    claimTokens,
    claimRefund,
  }
}
