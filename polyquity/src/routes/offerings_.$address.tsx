import {
  Link,
  createFileRoute,
  notFound,
  useLoaderData,
} from '@tanstack/react-router'
import { ArrowLeft, ExternalLink, FileText } from 'lucide-react'
import { formatUnits, parseEther } from 'viem'
import { useState, useEffect } from 'react'
import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi'
import { getIPO } from '../../server/functions/ipos'
import { POLY_IPO_ABI } from '@/lib/constants'

export const Route = createFileRoute('/offerings_/$address')({
  loader: async ({ params }) => {
    const { address } = params
    const ipoData = await getIPO({ data: { contractAddress: address } })

    console.log('SERVER LOADER address received:', address)
    console.log('SERVER LOADER ipoData:', ipoData)

    return { ipoData, address }
  },
  component: IpoDetailsPage,
  notFoundComponent: () => {
    return (
      <div className="min-h-screen bg-[#faf8ff] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#131b2e] mb-4">
            IPO Not Found
          </h1>
          <p className="text-[#131b2e]/60 mb-6">
            The IPO you are looking for does not exist or has been removed.
          </p>
          <Link
            to="/offerings"
            className="inline-flex items-center gap-2 text-[#004ac6] font-medium hover:underline"
          >
            <ArrowLeft className="size-4" /> Back to Offerings
          </Link>
        </div>
      </div>
    )
  },
})

function formatEth(
  valueString: string | bigint,
  decimals: number = 18,
): string {
  const value =
    typeof valueString === 'bigint' ? valueString : BigInt(valueString || '0')
  if (value === 0n) return '0 ETH'
  try {
    return `${formatUnits(value, decimals)} ETH`
  } catch {
    return '0 ETH'
  }
}

function IpoDetailsPage() {
  const { ipoData, address } = Route.useLoaderData()

  if (!ipoData) {
    return (
      <div className="p-10">
        <h1>IPO was strictly null from getIPO!</h1>
        <p>Address passed to loader: {address}</p>
      </div>
    )
  }

  const ipo = ipoData
  const company = ipo.company

  const [bidAmount, setBidAmount] = useState('')
  const [txHash, setTxHash] = useState<`0x${string}`>()
  const [isClient, setIsClient] = useState(false)

  // Web3 interactions
  const contractAddress = ipo.contractAddress as `0x${string}`

  const { data: effectiveState, refetch: refetchState } = useReadContract({
    address: contractAddress,
    abi: POLY_IPO_ABI,
    functionName: 'getEffectiveState',
    query: { refetchInterval: 3000 },
  })

  // We fetch the live raised amount to overwrite SSR totalRaised
  const { data: liveTotalRaised, refetch: refetchRaised } = useReadContract({
    address: contractAddress,
    abi: POLY_IPO_ABI,
    functionName: 's_totalRaised',
    query: { refetchInterval: 3000 },
  })

  const { writeContractAsync } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (isSuccess) {
      refetchState()
      refetchRaised()
      setTxHash(undefined)
      setBidAmount('')
    }
  }, [isSuccess, refetchState, refetchRaised])

  // stateVal based on smart contract
  const stateVal = effectiveState !== undefined ? (effectiveState as number) : 0

  // Use client-side (blockchain) value if mounted, otherwise fallback to SSR data
  const totalRaisedSource =
    isClient && liveTotalRaised !== undefined
      ? (liveTotalRaised as bigint)
      : ipo.totalRaised

  const totalRaisedFormatted = formatEth(totalRaisedSource)
  const totalTokensFormatted = formatEth(ipo.totalTokens)

  const raisedNum = Number(formatUnits(BigInt(totalRaisedSource || '0'), 18))
  const goalNum = Number(formatUnits(BigInt(ipo.totalTokens || '0'), 18))
  const progressPercentage =
    goalNum > 0 ? Math.min(100, (raisedNum / goalNum) * 100) : 0

  const isActive = stateVal === 0
  const isCompleted = stateVal === 1
  const isFailed = stateVal === 2

  const getStateLabel = () => {
    if (effectiveState === undefined)
      // fallback to database status before blockchain finishes loading
      return ipo.status.charAt(0).toUpperCase() + ipo.status.slice(1)
    if (isActive) return 'Active'
    if (isCompleted) return 'Completed'
    if (isFailed) return 'Failed'
    return 'Unknown'
  }

  const getStateColor = () => {
    if (effectiveState === undefined) {
      if (ipo.status === 'active') return 'bg-green-100 text-green-700'
      if (ipo.status === 'finalized') return 'bg-blue-100 text-blue-700'
      if (ipo.status === 'cancelled') return 'bg-red-100 text-red-700'
      return 'bg-gray-100 text-gray-700'
    }
    if (isActive) return 'bg-green-100 text-green-700'
    if (isCompleted) return 'bg-blue-100 text-blue-700'
    if (isFailed) return 'bg-red-100 text-red-700'
    return 'bg-gray-100 text-gray-700'
  }

  const handleBid = async () => {
    if (!bidAmount || Number(bidAmount) <= 0) return
    try {
      const hash = await writeContractAsync({
        address: contractAddress,
        abi: POLY_IPO_ABI,
        functionName: 'bid',
        value: parseEther(bidAmount),
      })
      setTxHash(hash)
    } catch (err: any) {
      console.error(err)
      alert('Bid failed: ' + (err.shortMessage || err.message))
    }
  }

  const handleClaimTokens = async () => {
    try {
      const hash = await writeContractAsync({
        address: contractAddress,
        abi: POLY_IPO_ABI,
        functionName: 'claimTokens',
      })
      setTxHash(hash)
    } catch (err: any) {
      console.error(err)
      alert('Claim Tokens failed: ' + (err.shortMessage || err.message))
    }
  }

  const handleClaimRefund = async () => {
    try {
      const hash = await writeContractAsync({
        address: contractAddress,
        abi: POLY_IPO_ABI,
        functionName: 'claimRefund',
      })
      setTxHash(hash)
    } catch (err: any) {
      console.error(err)
      alert('Claim Refund failed: ' + (err.shortMessage || err.message))
    }
  }

  return (
    <div className="min-h-screen bg-[#faf8ff] text-[#131b2e] font-sans">
      <header className="sticky top-0 z-50 bg-[#ffffff]/80 backdrop-blur-md px-6 py-4 flex items-center shadow-[0_4px_20px_rgba(19,27,46,0.02)]">
        <Link
          to="/offerings"
          className="flex items-center gap-2 text-[#131b2e]/60 hover:text-[#004ac6] font-medium transition-colors text-sm"
        >
          <ArrowLeft className="size-4" /> Back to Offerings
        </Link>
      </header>

      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#ffffff] rounded-xl p-6 shadow-[0_24px_40px_rgba(19,27,46,0.05)] border border-[#c3c6d7]/20">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-extrabold tracking-tight text-[#131b2e]">
                    {ipo.tokenName}
                  </h1>
                  <span className="text-sm font-bold text-[#131b2e]/60 uppercase tracking-widest">
                    {ipo.tokenSymbol}
                  </span>
                </div>
                <p className="text-xl font-semibold text-[#004ac6]">
                  {company?.name || 'Unknown Issuer'}
                </p>
              </div>

              {company?.description && (
                <div className="mb-6">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-[#131b2e]/40 mb-2">
                    About the Company
                  </h2>
                  <p className="text-[#131b2e]/80 leading-relaxed whitespace-pre-wrap">
                    {company.description}
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <FileText className="size-4 text-[#004ac6]" />
                  <h2 className="text-sm font-bold uppercase tracking-wide text-[#131b2e]/40">
                    Offering Document
                  </h2>
                </div>
                {ipo.ipfsDocCid ? (
                  <iframe
                    src={`https://gateway.pinata.cloud/ipfs/${ipo.ipfsDocCid}`}
                    className="w-full h-[600px] rounded-xl overflow-hidden border border-[#c3c6d7]/30 bg-[#faf8ff]"
                    title="Offering Document"
                  />
                ) : (
                  <div className="w-full h-[600px] rounded-xl border border-[#c3c6d7]/30 bg-[#faf8ff] flex items-center justify-center">
                    <p className="text-[#131b2e]/40">No document available</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-[#ffffff] rounded-xl p-6 shadow-[0_24px_40px_rgba(19,27,46,0.05)] border border-[#c3c6d7]/20">
              <div className="mb-6">
                <span
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold ${getStateColor()}`}
                >
                  {getStateLabel()}
                </span>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <div className="flex justify-between items-end text-sm mb-2">
                    <span className="text-[#131b2e]/60 font-medium">
                      Total Raised
                    </span>
                    <span className="font-bold text-[#004ac6]">
                      {totalRaisedFormatted}
                    </span>
                  </div>
                  <div className="flex justify-between items-end text-xs text-[#131b2e]/40 mb-1">
                    <span>Hard Cap</span>
                    <span>{totalTokensFormatted}</span>
                  </div>
                  <div className="w-full bg-[#f2f3ff] h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-[#004ac6] to-[#2563eb] h-full rounded-full transition-all"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-6 border-t border-[#c3c6d7]/20">
                {isActive && (
                  <>
                    <div>
                      <label className="text-xs font-medium text-[#131b2e]/60 block mb-2">
                        Bid Amount (ETH)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-[#faf8ff] border border-[#c3c6d7]/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#004ac6]/50 focus:ring-2 focus:ring-[#004ac6]/20 transition-all font-medium"
                      />
                    </div>
                    <button
                      onClick={handleBid}
                      disabled={isConfirming || !bidAmount}
                      className="w-full bg-[#004ac6] hover:bg-[#0039a0] disabled:bg-[#c3c6d7] text-white rounded-xl py-3 px-4 font-semibold transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(0,74,198,0.2)]"
                    >
                      {isConfirming ? (
                        <>
                          <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                          Confirming...
                        </>
                      ) : (
                        'Submit Bid'
                      )}
                    </button>
                  </>
                )}

                {isCompleted && (
                  <button
                    onClick={handleClaimTokens}
                    disabled={isConfirming}
                    className="w-full bg-[#004ac6] hover:bg-[#0039a0] disabled:bg-[#c3c6d7] text-white rounded-xl py-3 px-4 font-semibold transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(0,74,198,0.2)]"
                  >
                    {isConfirming ? (
                      <>
                        <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                        Confirming...
                      </>
                    ) : (
                      'Claim Tokens'
                    )}
                  </button>
                )}

                {isFailed && (
                  <button
                    onClick={handleClaimRefund}
                    disabled={isConfirming}
                    className="w-full bg-[#ef4444] hover:bg-[#dc2626] disabled:bg-[#c3c6d7] text-white rounded-xl py-3 px-4 font-semibold transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(239,68,68,0.2)]"
                  >
                    {isConfirming ? (
                      <>
                        <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                        Confirming...
                      </>
                    ) : (
                      'Claim Refund'
                    )}
                  </button>
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-[#c3c6d7]/20 space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-[#131b2e]/60">Token Price</span>
                  <span className="font-medium">
                    {formatEth(ipo.pricePerToken)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#131b2e]/60">Start Time</span>
                  <span className="font-medium">
                    {new Date(ipo.startTime).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#131b2e]/60">End Time</span>
                  <span className="font-medium">
                    {new Date(ipo.endTime).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#131b2e]/60">Contract</span>
                  <a
                    href={`https://testnet.snowtrace.io/address/${contractAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-[#004ac6] hover:underline flex items-center gap-1"
                  >
                    View <ExternalLink className="size-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
