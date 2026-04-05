import { Link } from '@tanstack/react-router'
import { createFileRoute, useLoaderData } from '@tanstack/react-router'
import { Bell, ShieldCheck, ChevronRight, Activity, Coins } from 'lucide-react'
import { getIPOs } from 'server/functions/ipos'
import { WalletConnectButton } from '@/components/wallet-connect-button'
import { useEffect, useState } from 'react'
import { formatUnits, parseEther } from 'viem'
import {
  useWriteContract,
  useReadContract,
  useWaitForTransactionReceipt,
  useAccount,
  useBalance,
} from 'wagmi'
// import { getAccount } from '@wagmi/core'
// import { config } from '@/lib/wagmi'
import { getInvestorStats } from 'server/functions/stats'
import { POLY_IPO_ABI, MINIMAL_ERC20_ABI } from '../lib/constants'
import { Web3Guard } from '@/Auth/components/web3-guard'
// import { getUser } from 'server/functions/users'

export const Route = createFileRoute('/investor')({
  loader: async () => {
    const result = await getIPOs({ data: {} })
    return { iposData: result }
  },
  component: InvestorDashboard,
})

// --- FIX: NATIVE CURRENCY FORMATTER ---
function formatNativeCurrency(valueString: string, decimals: number = 18) {
  if (!valueString || valueString === '0') return '0.00 ETH'

  try {
    const humanReadable = formatUnits(BigInt(valueString), decimals)
    return `${Number(humanReadable).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    })} ETH`
  } catch (error) {
    console.error('Formatting error:', error)
    return '0.00 ETH'
  }
}

function parseTokenAmount(valueString: string, decimals: number = 18) {
  if (!valueString || valueString === '0') return 0
  try {
    return Number(formatUnits(BigInt(valueString), decimals))
  } catch {
    return 0
  }
}

function calculateDaysLeft(endTime: string | Date) {
  const end = new Date(endTime).getTime()
  const now = Date.now()
  const diff = end - now

  if (diff <= 0) return 'Ended'

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  if (days > 0) return `${days} Days`
  return `${hours} Hours`
}

// --- MAIN UI COMPONENT ---

function LiveIPOCard({ ipo }: { ipo: any }) {
  const { address } = useAccount()
  const [bidAmount, setBidAmount] = useState('')
  const [txHash, setTxHash] = useState<`0x${string}`>()
  const { writeContractAsync } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  // 1. Existing IPO Contract Reads
  const { data: liveTotalRaised, refetch: refetchRaised } = useReadContract({
    address: ipo.contractAddress as `0x${string}`,
    abi: POLY_IPO_ABI,
    functionName: 's_totalRaised',
    query: { refetchInterval: 3000 },
  })

  const { data: effectiveState, refetch: refetchState } = useReadContract({
    address: ipo.contractAddress as `0x${string}`,
    abi: POLY_IPO_ABI,
    functionName: 'getEffectiveState',
    query: { refetchInterval: 3000 },
  })
  const stateVal = effectiveState !== undefined ? (effectiveState as number) : 0

  const { data: contributionStr, refetch: refetchContrib } = useReadContract({
    address: ipo.contractAddress as `0x${string}`,
    abi: POLY_IPO_ABI,
    functionName: 's_contributions',
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 3000 },
  })
  const contribution =
    contributionStr !== undefined ? (contributionStr as bigint) : 0n

  const { data: claimableTokensStr, refetch: refetchClaimable } =
    useReadContract({
      address: ipo.contractAddress as `0x${string}`,
      abi: POLY_IPO_ABI,
      functionName: 'getClaimableTokens',
      args: address ? [address] : undefined,
      query: { enabled: !!address, refetchInterval: 3000 },
    })
  const claimableTokens =
    claimableTokensStr !== undefined ? (claimableTokensStr as bigint) : 0n

  // 2. NEW: Read Token Address & User Balance
  const { data: tokenAddress } = useReadContract({
    address: ipo.contractAddress as `0x${string}`,
    abi: POLY_IPO_ABI,
    functionName: 'i_token',
  })

  const { data: tokenBalance, refetch: refetchBalance } = useReadContract({
    address: tokenAddress as `0x${string}` | undefined,
    abi: MINIMAL_ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!tokenAddress, refetchInterval: 3000 },
  })

  useEffect(() => {
    if (isSuccess) {
      refetchRaised()
      refetchState()
      refetchContrib()
      refetchClaimable()
      refetchBalance()
      setTxHash(undefined)
      setBidAmount('')
    }
  }, [
    isSuccess,
    refetchRaised,
    refetchState,
    refetchContrib,
    refetchClaimable,
    refetchBalance,
  ])

  const displayRaised =
    liveTotalRaised !== undefined ? liveTotalRaised.toString() : ipo.totalRaised

  // --- Transactions ---
  const handleBid = async () => {
    if (!bidAmount || Number(bidAmount) <= 0)
      return alert('Please enter a valid ETH amount greater than 0')
    try {
      const hash = await writeContractAsync({
        address: ipo.contractAddress as `0x${string}`,
        abi: POLY_IPO_ABI,
        functionName: 'bid',
        value: parseEther(bidAmount),
      })
      setTxHash(hash)
    } catch (error: any) {
      alert(`Transaction Failed: ${error.shortMessage || error.message}`)
    }
  }

  const handleClaim = async () => {
    try {
      const hash = await writeContractAsync({
        address: ipo.contractAddress as `0x${string}`,
        abi: POLY_IPO_ABI,
        functionName: 'claimTokens',
      })
      setTxHash(hash)
    } catch (error: any) {
      alert(`Transaction Failed: ${error.shortMessage || error.message}`)
    }
  }

  const handleRefund = async () => {
    try {
      const hash = await writeContractAsync({
        address: ipo.contractAddress as `0x${string}`,
        abi: POLY_IPO_ABI,
        functionName: 'claimRefund',
      })
      setTxHash(hash)
    } catch (error: any) {
      alert(`Transaction Failed: ${error.shortMessage || error.message}`)
    }
  }

  const raisedNum = parseTokenAmount(displayRaised, 18)
  const goalNum = parseTokenAmount(ipo.totalTokens, 18)
  const progressPercentage =
    goalNum > 0 ? Math.min(100, (raisedNum / goalNum) * 100) : 0

  return (
    <div className="bg-[#ffffff] rounded-xl p-6 shadow-[0_24px_40px_rgba(19,27,46,0.05)] flex flex-col border border-[#c3c6d7]/20 transition-transform duration-300 hover:-translate-y-1">
      <div className="space-y-4 mb-8">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h3 className="font-bold text-xl leading-tight text-[#131b2e]">
              {ipo.tokenName}
            </h3>
            <p className="text-sm font-bold text-[#131b2e]/40 uppercase tracking-widest">
              ${ipo.tokenSymbol}
            </p>
          </div>
          <div
            className={`px-2.5 py-1 rounded-xl flex items-center gap-1.5 text-xs font-bold ${stateVal === 0 ? 'bg-[#f2f3ff] text-[#004ac6]' : stateVal === 1 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}
          >
            <ShieldCheck className="size-3.5" />{' '}
            {stateVal === 0
              ? 'Active'
              : stateVal === 1
                ? 'Completed'
                : 'Failed'}
          </div>
        </div>
      </div>

      <div className="space-y-6 flex-1">
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-[#131b2e]/60 font-medium">
              Price per Token
            </span>
            <span className="font-bold text-[#004ac6]">
              {formatNativeCurrency(ipo.pricePerToken, 18)}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-[#131b2e]/60 font-medium">Ends In</span>
            <span className="font-bold">{calculateDaysLeft(ipo.endTime)}</span>
          </div>

          {/* Locked ETH Stake */}
          {address && contribution > 0n && (
            <div className="flex justify-between items-center text-sm bg-gray-50 px-3 py-2 rounded-lg">
              <span className="text-[#131b2e]/60 font-medium">
                Locked Stake
              </span>
              <span className="font-bold text-[#131b2e]">
                {formatNativeCurrency(contribution.toString(), 18)}
              </span>
            </div>
          )}

          {/* NEW: Acquired Token Balance Display */}
          {address &&
            tokenBalance !== undefined &&
            (tokenBalance as bigint) > 0n && (
              <div className="flex justify-between items-center text-sm bg-[#f2f3ff] px-3 py-2 rounded-lg border border-[#004ac6]/20">
                <span className="text-[#004ac6] font-semibold flex items-center gap-1.5">
                  <Coins className="size-4" /> Your Portfolio
                </span>
                <span className="font-bold text-[#004ac6]">
                  {formatUnits(tokenBalance as bigint, 18)} {ipo.tokenSymbol}
                </span>
              </div>
            )}
        </div>

        {/* LIVE Liquidity Gauge */}
        <div className="space-y-2 pt-2">
          <div className="flex justify-between items-end text-sm">
            <span className="font-bold text-[#004ac6]">
              {formatNativeCurrency(displayRaised, 18)} Raised
            </span>
            <span className="text-[#131b2e]/50 font-medium text-xs">
              Goal: {formatNativeCurrency(ipo.totalTokens, 18)}
            </span>
          </div>
          <div className="w-full bg-[#f2f3ff] h-2.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-out ${stateVal === 1 ? 'bg-gradient-to-r from-green-500 to-emerald-400' : stateVal === 2 ? 'bg-gradient-to-r from-red-500 to-rose-400' : 'bg-gradient-to-r from-[#004ac6] to-[#2563eb]'}`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Interactive Footer */}
      <div className="pt-8 mt-auto space-y-3">
        {stateVal === 0 ? (
          <>
            <input
              type="number"
              min="0.001"
              step="0.01"
              placeholder="Amount to Invest (ETH)"
              className="w-full bg-[#f2f3ff] border border-[#c3c6d7]/50 rounded-xl px-4 py-3.5 text-[#131b2e] placeholder:text-[#131b2e]/40 focus:outline-none focus:border-[#004ac6]/50 focus:ring-2 focus:ring-[#004ac6]/20 transition-all font-medium disabled:opacity-50"
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              disabled={isConfirming}
            />
            <button
              onClick={handleBid}
              disabled={isConfirming || !address}
              className="w-full bg-gradient-to-br from-[#004ac6] to-[#2563eb] text-white rounded-xl py-3.5 px-4 font-semibold shadow-[0_8px_16px_rgba(0,74,198,0.15)] hover:shadow-[0_12px_24px_rgba(0,74,198,0.25)] hover:-translate-y-0.5 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isConfirming ? 'Confirming...' : 'Submit Bid'}
            </button>
          </>
        ) : stateVal === 1 ? (
          claimableTokens > 0n ? (
            <button
              onClick={handleClaim}
              disabled={isConfirming}
              className="w-full bg-gradient-to-br from-green-600 to-emerald-500 text-white rounded-xl py-3.5 px-4 font-semibold shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isConfirming
                ? 'Processing...'
                : `Claim ${formatUnits(claimableTokens, 18)} ${ipo.tokenSymbol}`}
            </button>
          ) : contribution > 0n ? (
            <div className="w-full text-center bg-gray-100 text-gray-500 rounded-xl py-3.5 font-semibold">
              Tokens Claimed
            </div>
          ) : null
        ) : contribution > 0n ? (
          <button
            onClick={handleRefund}
            disabled={isConfirming}
            className="w-full bg-gradient-to-br from-red-600 to-rose-500 text-white rounded-xl py-3.5 px-4 font-semibold shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {isConfirming ? 'Processing...' : 'Claim Refund'}
          </button>
        ) : (
          <div className="w-full text-center bg-gray-100 text-gray-500 rounded-xl py-3.5 font-semibold">
            Refund Issued
          </div>
        )}
      </div>
    </div>
  )
}

function InvestorDashboard() {
  const { iposData } = useLoaderData({ from: '/investor' })
  const ipos = iposData.ipos

  const { address } = useAccount()
  const { data: ethBalance } = useBalance({ address })
  const [stats, setStats] = useState({ activeBids: 0, totalDeployedWei: '0' })

  useEffect(() => {
    if (address) {
      // Call our TanStack server function!
      getInvestorStats({ data: { walletAddress: address } })
        .then(setStats)
        .catch(console.error)
    }
  }, [address])

  return (
    <Web3Guard allowedRole="investor">
      <div className="min-h-screen bg-[#faf8ff] text-[#131b2e] font-sans selection:bg-[#004ac6]/20">
        {/* 1. The Glassmorphic Top Nav */}
        <header className="sticky top-0 z-50 bg-[#ffffff]/80 backdrop-blur-md px-6 py-4 flex items-center justify-between shadow-[0_4px_20px_rgba(19,27,46,0.02)]">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-xl bg-gradient-to-br from-[#004ac6] to-[#2563eb] flex items-center justify-center shadow-[0_8px_16px_rgba(0,74,198,0.2)]">
              <div className="size-3 bg-white rounded-full opacity-90" />
            </div>
            <span className="font-extrabold tracking-widest uppercase text-sm text-[#131b2e]">
              Polyquity
            </span>
          </div>

          <div className="flex items-center gap-6">
            <button className="text-[#131b2e]/60 hover:text-[#131b2e] transition-colors relative">
              <Bell className="size-5" />
              <span className="absolute top-0 right-0 size-2 bg-[#2563eb] rounded-full ring-2 ring-[#ffffff]" />
            </button>
            <WalletConnectButton />
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12 space-y-16">
          {/* Page Header */}
          <div className="space-y-2">
            <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-[#131b2e]">
              Investor Vault
            </h1>
            <p className="text-[#131b2e]/60 text-lg max-w-2xl leading-relaxed">
              Manage your deployed capital, monitor active bids, and discover
              institutional-grade tokenized equity offerings.
            </p>
          </div>

          {/* 2. Portfolio Overview (The Vault Layer) */}
          <section className="bg-[#f2f3ff] p-6 lg:p-8 rounded-xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              {/* Box 1: Total Capital Deployed */}
              <div className="bg-[#ffffff] rounded-xl p-6 shadow-[0_24px_40px_rgba(19,27,46,0.05)] flex flex-col justify-between h-32">
                <span className="text-sm font-semibold tracking-wide text-[#131b2e]/50 uppercase">
                  Total Capital Deployed
                </span>
                <span className="text-3xl font-extrabold tracking-tight">
                  {formatNativeCurrency(stats.totalDeployedWei, 18)}
                </span>
              </div>

              {/* Box 2: Active Bids */}
              <div className="bg-[#ffffff] rounded-xl p-6 shadow-[0_24px_40px_rgba(19,27,46,0.05)] flex flex-col justify-between h-32">
                <span className="text-sm font-semibold tracking-wide text-[#131b2e]/50 uppercase">
                  Active Bids
                </span>
                <span className="text-3xl font-extrabold tracking-tight">
                  {stats.activeBids}
                </span>
              </div>

              {/* Box 3: Available Liquidity */}
              <div className="bg-[#ffffff] rounded-xl p-6 shadow-[0_24px_40px_rgba(19,27,46,0.05)] flex flex-col justify-between h-32">
                <span className="text-sm font-semibold tracking-wide text-[#131b2e]/50 uppercase">
                  Available Liquidity
                </span>
                <span className="text-3xl font-extrabold tracking-tight text-[#004ac6]">
                  {ethBalance
                    ? `${Number(ethBalance.formatted).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ETH`
                    : '0.00 ETH'}
                </span>
              </div>
            </div>
          </section>

          {/* 3. Active Offerings Grid */}
          <section className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight">
                Active Offerings
              </h2>
              <Link
                to="/offerings"
                className="text-sm font-semibold text-[#004ac6] flex items-center gap-1 hover:opacity-80 transition-opacity"
              >
                View All <ChevronRight className="size-4" />
              </Link>
            </div>

            {ipos.length === 0 ? (
              <div className="bg-[#ffffff] rounded-xl p-12 shadow-[0_24px_40px_rgba(19,27,46,0.05)] border border-[#c3c6d7]/20 flex flex-col items-center justify-center text-center">
                <div className="size-16 rounded-full bg-[#f2f3ff] flex items-center justify-center mb-4">
                  <Activity className="size-8 text-[#004ac6]/40" />
                </div>
                <h3 className="text-xl font-bold text-[#131b2e] mb-2">
                  No Active Offerings
                </h3>
                <p className="text-[#131b2e]/60 max-w-md mx-auto">
                  There are currently no active institutional offerings on the
                  network. Check back soon or ensure your node indexer is
                  running.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {ipos.map((ipo) => (
                  <LiveIPOCard key={ipo.id} ipo={ipo} />
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </Web3Guard>
  )
}
