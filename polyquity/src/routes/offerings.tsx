// src/routes/offerings.tsx
import { createFileRoute, useLoaderData, Link } from '@tanstack/react-router'
import { ShieldCheck, ArrowLeft, Search } from 'lucide-react'
import { getIPOs } from 'server/functions/ipos'
import { formatUnits } from 'viem'

export const Route = createFileRoute('/offerings')({
  loader: async () => {
    // Fetch all IPOs (You can add pagination params here later)
    const result = await getIPOs({ data: {} })
    return { iposData: result }
  },
  component: OfferingsCatalog,
})

// --- UTILITIES ---
function formatCurrency(valueString: string, decimals: number = 18) {
  if (!valueString || valueString === '0') return '$0.00'
  try {
    const humanReadable = formatUnits(BigInt(valueString), decimals)
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(Number(humanReadable))
  } catch {
    return '$0.00'
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
  const diff = new Date(endTime).getTime() - Date.now()
  if (diff <= 0) return 'Ended'
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  return days > 0 ? `${days} Days` : 'Ending Soon'
}

// --- MAIN UI ---
function OfferingsCatalog() {
  const { iposData } = useLoaderData({ from: '/offerings' })
  const ipos = iposData.ipos

  return (
    <div className="min-h-screen bg-[#faf8ff] text-[#131b2e] font-sans">
      {/* Simple Header */}
      <header className="sticky top-0 z-50 bg-[#ffffff]/80 backdrop-blur-md px-6 py-4 flex items-center shadow-[0_4px_20px_rgba(19,27,46,0.02)]">
        <Link
          to="/investor"
          className="flex items-center gap-2 text-[#131b2e]/60 hover:text-[#004ac6] font-medium transition-colors text-sm"
        >
          <ArrowLeft className="size-4" /> Back to Vault
        </Link>
      </header>

      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12 space-y-12">
        {/* Title & Filters (Visual Mock) */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-extrabold tracking-tight text-[#131b2e]">
              Active Offerings
            </h1>
            <p className="text-[#131b2e]/60 text-lg">
              Explore and bid on fully-compliant tokenized equity.
            </p>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#131b2e]/40" />
            <input
              type="text"
              placeholder="Search companies..."
              className="w-full bg-[#ffffff] border border-[#c3c6d7]/30 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#004ac6]/50 focus:ring-2 focus:ring-[#004ac6]/20 transition-all shadow-[0_8px_16px_rgba(19,27,46,0.02)]"
            />
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {ipos.map((ipo) => {
            const raisedNum = parseTokenAmount(ipo.totalRaised, 18)
            const goalNum = parseTokenAmount(ipo.totalTokens, 18)
            const progressPercentage =
              goalNum > 0 ? Math.min(100, (raisedNum / goalNum) * 100) : 0

            return (
              <div
                key={ipo.id}
                className="bg-[#ffffff] rounded-xl p-6 shadow-[0_24px_40px_rgba(19,27,46,0.05)] flex flex-col border border-[#c3c6d7]/20 transition-transform hover:-translate-y-1"
              >
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h3 className="font-bold text-lg leading-tight text-[#131b2e] truncate max-w-[150px]">
                        {ipo.tokenName}
                      </h3>
                      <p className="text-xs font-bold text-[#131b2e]/40 uppercase tracking-widest">
                        ${ipo.tokenSymbol}
                      </p>
                    </div>
                    <div className="bg-[#f2f3ff] text-[#004ac6] px-2 py-1 rounded-lg flex items-center gap-1 text-[10px] font-bold">
                      <ShieldCheck className="size-3" />
                      Verified
                    </div>
                  </div>
                </div>

                <div className="space-y-5 flex-1">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#131b2e]/60 font-medium">
                        Price
                      </span>
                      <span className="font-bold text-[#004ac6]">
                        {formatCurrency(ipo.pricePerToken, 18)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#131b2e]/60 font-medium">
                        Ends In
                      </span>
                      <span className="font-bold">
                        {calculateDaysLeft(ipo.endTime)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-[#c3c6d7]/20">
                    <div className="flex justify-between items-end text-[10px] font-medium uppercase tracking-wide">
                      <span className="text-[#004ac6]">
                        {progressPercentage.toFixed(0)}% Funded
                      </span>
                      <span className="text-[#131b2e]/40">
                        {formatCurrency(ipo.totalTokens, 18)}
                      </span>
                    </div>
                    <div className="w-full bg-[#f2f3ff] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-[#004ac6] to-[#2563eb] h-full rounded-full transition-all"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6 mt-auto">
                  <button className="w-full bg-[#f2f3ff] hover:bg-[#004ac6] hover:text-white text-[#004ac6] rounded-xl py-2.5 px-4 text-sm font-semibold transition-all">
                    View Details
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
