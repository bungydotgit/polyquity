import { useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useAccount, useWriteContract, useReadContract } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import {
  Bell,
  Loader2,
  Rocket,
  UploadCloud,
  Wallet,
  Check,
  AlertTriangle,
} from 'lucide-react'

import { uploadToIPFS } from '../../server/functions/ipfs'
import {
  POLY_FACTORY_ABI,
  POLY_FACTORY_ADDRESS,
  POLY_IPO_ABI,
} from '../lib/constants'

export const Route = createFileRoute('/issuer')({
  component: IssuerDashboard,
})

// --- REUSABLE UI COMPONENTS ---

function FormInput({
  label,
  placeholder,
  type = 'text',
  value,
  onChange,
}: {
  label: string
  placeholder: string
  type?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <div className="flex flex-col">
      <label className="block text-sm font-bold text-[#131b2e]/60 uppercase tracking-wide mb-2.5">
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full bg-[#ffffff] border border-[#c3c6d7]/20 rounded-xl px-4 py-3.5 text-[#131b2e] placeholder:text-[#131b2e]/30 focus:outline-none focus:border-[#004ac6]/50 focus:ring-2 focus:ring-[#004ac6]/20 transition-all font-medium"
      />
    </div>
  )
}

// --- MAIN LAYOUT ---

function IssuerIPOCard({ ipoAddress }: { ipoAddress: string }) {
  const { data: effectiveState, refetch: refetchState } = useReadContract({
    address: ipoAddress as `0x${string}`,
    abi: POLY_IPO_ABI,
    functionName: 'getEffectiveState',
    query: { refetchInterval: 3000 },
  })

  const { data: s_totalRaised, refetch: refetchRaised } = useReadContract({
    address: ipoAddress as `0x${string}`,
    abi: POLY_IPO_ABI,
    functionName: 's_totalRaised',
    query: { refetchInterval: 3000 },
  })

  // NEW: Check if funds have actually been withdrawn
  const { data: isWithdrawn, refetch: refetchWithdrawn } = useReadContract({
    address: ipoAddress as `0x${string}`,
    abi: POLY_IPO_ABI,
    functionName: 's_fundsWithdrawn',
    query: { refetchInterval: 3000 },
  })

  const { writeContractAsync } = useWriteContract()
  const [isDeploying, setIsDeploying] = useState(false)

  // Function to manually finalize (if clock runs out but hard cap wasn't met)
  const handleFinalize = async () => {
    setIsDeploying(true)
    try {
      await writeContractAsync({
        address: ipoAddress as `0x${string}`,
        abi: POLY_IPO_ABI,
        functionName: 'finalize',
      })
      alert('IPO Finalized successfully!')
      refetchState()
    } catch (err: any) {
      alert(`Finalize failed: ${err.shortMessage || err.message}`)
    } finally {
      setIsDeploying(false)
    }
  }

  // NEW: Function to actually pull the ETH into your wallet
  const handleWithdraw = async () => {
    setIsDeploying(true)
    try {
      await writeContractAsync({
        address: ipoAddress as `0x${string}`,
        abi: POLY_IPO_ABI,
        // Make sure to add this function name to your POLY_IPO_ABI in constants.ts!
        functionName: 'withdrawRaisedFunds',
      })
      alert('Funds Withdrawn Successfully!')
      refetchWithdrawn()
    } catch (err: any) {
      alert(`Withdrawal failed: ${err.shortMessage || err.message}`)
    } finally {
      setIsDeploying(false)
    }
  }

  const stateVal = effectiveState !== undefined ? (effectiveState as number) : 0
  const raised = s_totalRaised !== undefined ? (s_totalRaised as bigint) : 0n
  const withdrawn = isWithdrawn !== undefined ? (isWithdrawn as boolean) : false

  return (
    <div className="bg-[#ffffff] border border-[#c3c6d7]/20 rounded-xl p-6 shadow-[0_24px_40px_rgba(19,27,46,0.05)] flex flex-col justify-between">
      <div className="space-y-4 mb-6">
        <h3 className="font-bold text-lg text-[#131b2e] break-all">
          Offering: {ipoAddress.slice(0, 6)}...{ipoAddress.slice(-4)}
        </h3>
        <div className="text-[#131b2e]/60 text-sm font-medium">
          Raised:{' '}
          <span className="font-bold text-[#131b2e]">
            {Number(formatEther(raised)).toFixed(2)} ETH
          </span>
        </div>
      </div>

      <div className="mt-auto">
        {stateVal === 0 && (
          <button
            onClick={handleFinalize}
            disabled={isDeploying}
            className="w-full bg-[#131b2e] text-white px-6 py-2.5 rounded-lg font-bold hover:bg-[#131b2e]/80 transition-colors disabled:opacity-50"
          >
            {isDeploying ? 'Processing...' : 'Finalize IPO'}
          </button>
        )}

        {stateVal === 1 && !withdrawn && (
          <button
            onClick={handleWithdraw}
            disabled={isDeploying}
            className="w-full bg-gradient-to-br from-[#004ac6] to-[#2563eb] text-white px-6 py-2.5 rounded-lg font-bold hover:opacity-90 transition-colors disabled:opacity-50 shadow-lg"
          >
            {isDeploying ? 'Processing...' : 'Withdraw Funds'}
          </button>
        )}

        {stateVal === 1 && withdrawn && (
          <div className="inline-flex items-center gap-2 bg-green-50 text-green-600 px-4 py-2 rounded-full font-bold text-sm w-full justify-center text-center">
            <Check className="size-4" /> Funds Withdrawn
          </div>
        )}

        {stateVal === 2 && (
          <div className="inline-flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-full font-bold text-sm w-full justify-center text-center">
            <AlertTriangle className="size-4" /> Failed (Refunding)
          </div>
        )}
      </div>
    </div>
  )
}
function IssuerManagement() {
  const { address } = useAccount()
  const { data: companyIPOs } = useReadContract({
    address: POLY_FACTORY_ADDRESS,
    abi: POLY_FACTORY_ABI,
    functionName: 'getCompanyIPOs',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  return (
    <section className="space-y-8 pt-8 border-t border-[#c3c6d7]/20">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-[#131b2e]">
          My Deployed Offerings
        </h2>
      </div>

      {!address ? (
        <div className="text-center py-12 text-[#131b2e]/60">
          Connect your wallet to see your deployed IPOs.
        </div>
      ) : companyIPOs === undefined ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-[#004ac6]" />
        </div>
      ) : (companyIPOs as `0x${string}`[]).length === 0 ? (
        <div className="text-center py-12 text-[#131b2e]/60">
          You haven't deployed any IPOs yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {(companyIPOs as string[]).map((addr) => (
            <IssuerIPOCard key={addr} ipoAddress={addr} />
          ))}
        </div>
      )}
    </section>
  )
}

function IssuerDashboard() {
  const { address } = useAccount()
  const { writeContractAsync } = useWriteContract()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [companyName, setCompanyName] = useState('')
  const [tokenSymbol, setTokenSymbol] = useState('')
  const [pricePerToken, setPricePerToken] = useState('')
  const [softCap, setSoftCap] = useState('')
  const [hardCap, setHardCap] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // File & loading state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDeploying, setIsDeploying] = useState(false)

  // --- Helpers ---

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        resolve(result.split(',')[1]) // Strip the data:application/pdf;base64, prefix
      }
      reader.onerror = (error) => reject(error)
      reader.readAsDataURL(file)
    })
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) setSelectedFile(file)
  }

  async function handleDeploy() {
    if (!selectedFile) return alert('Please upload a prospectus PDF.')
    if (!address) return alert('Please connect your wallet.')

    setIsDeploying(true)
    try {
      // Step A: Upload PDF to IPFS
      const fileBase64 = await fileToBase64(selectedFile)
      const ipfsResult = await uploadToIPFS({
        data: {
          fileBase64,
          fileName: selectedFile.name,
          mimeType: 'application/pdf',
        },
      })
      const { cid } = ipfsResult

      // Step B: Call PolyFactory.createIPO
      const currentUnixTime = Math.floor(Date.now() / 1000)
      let startUnix = Math.floor(new Date(startDate).getTime() / 1000)
      const endUnix = Math.floor(new Date(endDate).getTime() / 1000)

      // Safety buffer: If the selected start date is right now/today, push it 5 mins into the future
      if (startUnix <= currentUnixTime) {
        startUnix = currentUnixTime + 300 // + 5 minutes
      }

      // 3. Execute with parsed data targeting the Struct/Tuple signature
      await writeContractAsync({
        address: POLY_FACTORY_ADDRESS,
        abi: POLY_FACTORY_ABI,
        functionName: 'createIPO',
        args: [
          {
            tokenName: companyName,
            tokenSymbol: tokenSymbol,
            softCap: parseEther(softCap.toString() || '0'),
            hardCap: parseEther(hardCap.toString() || '0'),
            tokenPrice: parseEther(pricePerToken.toString() || '0'),
            startTime: BigInt(startUnix),
            endTime: BigInt(endUnix),
            companyWallet: address,
            ipfsCID: cid,
          },
        ],
      })

      alert('IPO deployed successfully!')
    } catch (err: any) {
      console.error('Deploy failed:', err)
      // Display the detailed Viem revert error if available
      const revertReason = err?.shortMessage || err?.message || 'Unknown error'
      alert(`Deployment failed: ${revertReason}`)
    } finally {
      setIsDeploying(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#faf8ff] text-[#131b2e] font-sans selection:bg-[#004ac6]/20 pb-20">
      {/* 1. The Glassmorphic Top Nav */}
      <header className="sticky top-0 z-50 bg-[#ffffff]/80 backdrop-blur-md px-6 py-4 flex items-center justify-between shadow-[0_4px_20px_rgba(19,27,46,0.02)]">
        <div className="flex items-center gap-2">
          {/* Logo Mark */}
          <div className="size-8 rounded-xl bg-gradient-to-br from-[#004ac6] to-[#2563eb] flex items-center justify-center shadow-[0_8px_16px_rgba(0,74,198,0.2)]">
            <div className="size-3 bg-white rounded-full opacity-90" />
          </div>
          <span className="font-extrabold tracking-widest uppercase text-sm text-[#131b2e]">
            Polyquity
          </span>
        </div>

        <div className="flex items-center gap-6">
          <span className="text-sm font-bold tracking-widest uppercase text-[#004ac6] hidden md:block">
            Issuer Portal
          </span>
          <button className="text-[#131b2e]/60 hover:text-[#131b2e] transition-colors relative">
            <Bell className="size-5" />
            <span className="absolute top-0 right-0 size-2 bg-[#2563eb] rounded-full ring-2 ring-[#ffffff]" />
          </button>

          {/* Wallet Connection Pill */}
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

              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    className="flex items-center gap-3 bg-[#f2f3ff] px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#c3c6d7]/20 transition-colors cursor-pointer"
                  >
                    <Wallet className="size-4 text-[#004ac6]" />
                    <span>Connect Wallet</span>
                  </button>
                )
              }

              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    className="flex items-center gap-3 bg-red-50 px-4 py-2 rounded-xl text-sm font-medium text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
                  >
                    <Wallet className="size-4" />
                    <span>Wrong Network</span>
                  </button>
                )
              }

              return (
                <div className="flex items-center gap-2">
                  <button
                    onClick={openChainModal}
                    className="flex items-center gap-2 bg-[#f2f3ff] px-3 py-2 rounded-xl text-sm font-medium hover:bg-[#c3c6d7]/20 transition-colors cursor-pointer"
                  >
                    {chain.hasIcon && chain.iconUrl && (
                      <img
                        alt={chain.name ?? 'Chain'}
                        src={chain.iconUrl}
                        className="size-4 rounded-full"
                      />
                    )}
                    <span className="hidden sm:inline">{chain.name}</span>
                  </button>
                  <button
                    onClick={openAccountModal}
                    className="flex items-center gap-3 bg-[#f2f3ff] px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#c3c6d7]/20 transition-colors cursor-pointer"
                  >
                    <Wallet className="size-4 text-[#004ac6]" />
                    <span>{account.displayName}</span>
                  </button>
                </div>
              )
            }}
          </ConnectButton.Custom>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12 space-y-12">
        {/* 2. Header */}
        <div className="space-y-2">
          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-[#131b2e]">
            Create Institutional Offering
          </h1>
          <p className="text-[#131b2e]/60 text-lg max-w-2xl leading-relaxed">
            Deploy your smart contract and immutably pin your prospectus to
            IPFS.
          </p>
        </div>

        {/* Two Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* 3. Left Column: The Configuration Form */}
          <div className="lg:col-span-2 bg-[#ffffff] p-8 lg:p-10 rounded-xl shadow-[0_24px_40px_rgba(19,27,46,0.05)] border border-[#c3c6d7]/20 space-y-12">
            {/* Section A: Asset Details */}
            <section className="space-y-6">
              <h2 className="text-2xl font-bold text-[#131b2e] tracking-tight">
                Asset Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <FormInput
                    label="Company Name"
                    placeholder="e.g., QuantX Infrastructure Ltd."
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>
                <FormInput
                  label="Token Symbol (Ticker)"
                  placeholder="e.g., QNTX"
                  value={tokenSymbol}
                  onChange={(e) => setTokenSymbol(e.target.value)}
                />
                <FormInput
                  label="Price per Token (USDC)"
                  placeholder="0.00"
                  type="number"
                  value={pricePerToken}
                  onChange={(e) => setPricePerToken(e.target.value)}
                />
              </div>
            </section>

            {/* Section B: Capital Parameters */}
            <section className="space-y-6">
              <h2 className="text-2xl font-bold text-[#131b2e] tracking-tight">
                Capital Parameters
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormInput
                  label="Soft Cap (USDC)"
                  placeholder="Minimum required to succeed"
                  type="number"
                  value={softCap}
                  onChange={(e) => setSoftCap(e.target.value)}
                />
                <FormInput
                  label="Hard Cap (USDC)"
                  placeholder="Maximum allocation"
                  type="number"
                  value={hardCap}
                  onChange={(e) => setHardCap(e.target.value)}
                />
              </div>
            </section>

            {/* Section C: Timeline */}
            <section className="space-y-6">
              <h2 className="text-2xl font-bold text-[#131b2e] tracking-tight">
                Timeline
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormInput
                  label="Offering Start Date"
                  placeholder="Select Date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <FormInput
                  label="Offering End Date"
                  placeholder="Select Date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </section>
          </div>

          {/* 4. Right Column: Document Upload & Deployment */}
          <div className="lg:col-span-1 space-y-6 sticky top-28">
            {/* The Upload Zone */}
            <div
              className="border-2 border-dashed border-[#c3c6d7]/40 bg-[#f2f3ff] rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#c3c6d7]/20 transition-colors group h-72"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="size-16 rounded-full bg-[#ffffff] shadow-[0_8px_16px_rgba(19,27,46,0.05)] flex items-center justify-center mb-6 group-hover:scale-110 group-hover:shadow-[0_12px_24px_rgba(19,27,46,0.08)] transition-all duration-300">
                <UploadCloud className="size-7 text-[#004ac6]" />
              </div>
              {selectedFile ? (
                <>
                  <h3 className="font-bold text-lg text-[#131b2e] mb-2">
                    {selectedFile.name}
                  </h3>
                  <p className="text-sm font-medium text-[#004ac6]">
                    Click to replace
                  </p>
                </>
              ) : (
                <>
                  <h3 className="font-bold text-lg text-[#131b2e] mb-2">
                    Upload DRHP Prospectus
                  </h3>
                  <p className="text-sm font-medium text-[#131b2e]/50 leading-relaxed max-w-[220px]">
                    PDF format. Will be pinned to IPFS for cryptographic
                    permanence.
                  </p>
                </>
              )}
            </div>

            {/* The Summary Box */}
            <div className="bg-[#f2f3ff] rounded-xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#131b2e]/60 uppercase tracking-wide">
                  Network
                </span>
                <span className="text-sm font-bold text-[#131b2e]">
                  Avalanche C-Chain
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#131b2e]/60 uppercase tracking-wide">
                  Est. Gas Fee
                </span>
                <span className="text-sm font-bold text-[#131b2e]">
                  ~0.045 AVAX
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#131b2e]/60 uppercase tracking-wide">
                  IPFS Pinning
                </span>
                <span className="text-sm font-bold text-[#004ac6]">
                  Covered by Polyquity
                </span>
              </div>
            </div>

            {/* The Action Button */}
            <button
              onClick={handleDeploy}
              disabled={isDeploying}
              className="w-full bg-gradient-to-br from-[#004ac6] to-[#2563eb] text-white rounded-xl py-4 px-6 font-bold text-lg shadow-[0_8px_16px_rgba(0,74,198,0.15)] hover:shadow-[0_12px_24px_rgba(0,74,198,0.25)] hover:-translate-y-0.5 transition-all active:scale-[0.98] flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[0_8px_16px_rgba(0,74,198,0.15)]"
            >
              {isDeploying ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  Deploying...
                </>
              ) : (
                <>
                  <Rocket className="size-5" />
                  Deploy IPO to Avalanche
                </>
              )}
            </button>
          </div>
        </div>

        <IssuerManagement />
      </main>
    </div>
  )
}
