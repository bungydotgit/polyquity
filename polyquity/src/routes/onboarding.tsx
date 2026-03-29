import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useAccount } from 'wagmi'

import {
  ShieldCheck,
  Building2,
  Briefcase,
  Fingerprint,
} from 'lucide-react'

import { registerUser } from 'server/functions/users'
import { recordKycVerification } from 'server/functions/kyc'
import { ReclaimVerification } from '../components/ReclaimVerification'

export const Route = createFileRoute('/onboarding')({
  component: OnboardingFlow,
})

type Role = 'investor' | 'issuer' | null

function OnboardingFlow() {
  const [selectedRole, setSelectedRole] = useState<Role>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const { address } = useAccount()
  const navigate = useNavigate()

  const registerUserFn = useServerFn(registerUser)
  const recordKycFn = useServerFn(recordKycVerification)

  const handleReclaimSuccess = async () => {
    if (!address || !selectedRole) return
    setIsProcessing(true)

    try {
      await registerUserFn({
        data: {
          walletAddress: address,
          role: selectedRole,
        },
      })

      const mockTxHash = '0xMockHashWaitUntilSmartContractIsReady...'

      await recordKycFn({
        data: {
          walletAddress: address,
          txHash: mockTxHash,
          chainId: 43113,
          signature: 'reclaim-verification-signature',
        },
      })

      navigate({ to: selectedRole === 'investor' ? '/investor' : '/issuer' })
    } catch (error) {
      console.error('Failed to complete onboarding:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#faf8ff] text-[#131b2e] font-sans flex items-center justify-center p-6 selection:bg-[#004ac6]/20">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-12 space-y-4">
          <div className="size-12 rounded-2xl bg-gradient-to-br from-[#004ac6] to-[#2563eb] flex items-center justify-center shadow-[0_8px_16px_rgba(0,74,198,0.2)] mx-auto mb-6">
            <ShieldCheck className="size-6 text-white" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#131b2e]">
            Verify Your Identity
          </h1>
          <p className="text-[#131b2e]/60 text-lg max-w-md mx-auto leading-relaxed">
            Polyquity requires zero-knowledge identity verification to comply
            with global securities regulations.
          </p>
        </div>

        <div className="bg-[#ffffff] rounded-2xl p-8 shadow-[0_24px_40px_rgba(19,27,46,0.05)] border border-[#c3c6d7]/20 relative overflow-hidden">
          {!selectedRole ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-sm font-bold text-[#131b2e]/50 uppercase tracking-widest text-center mb-8">
                Select Your Network Role
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setSelectedRole('investor')}
                  className="group bg-[#faf8ff] border border-[#c3c6d7]/30 rounded-xl p-6 text-left hover:border-[#004ac6]/50 hover:bg-[#f2f3ff] transition-all flex flex-col gap-4"
                >
                  <div className="size-10 rounded-lg bg-[#ffffff] shadow-[0_4px_12px_rgba(19,27,46,0.05)] flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Briefcase className="size-5 text-[#004ac6]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-[#131b2e] mb-1">
                      Investor
                    </h3>
                    <p className="text-sm text-[#131b2e]/60 leading-relaxed">
                      I want to deploy capital and bid on institutional
                      tokenized equity.
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => setSelectedRole('issuer')}
                  className="group bg-[#faf8ff] border border-[#c3c6d7]/30 rounded-xl p-6 text-left hover:border-[#004ac6]/50 hover:bg-[#f2f3ff] transition-all flex flex-col gap-4"
                >
                  <div className="size-10 rounded-lg bg-[#ffffff] shadow-[0_4px_12px_rgba(19,27,46,0.05)] flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Building2 className="size-5 text-[#004ac6]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-[#131b2e] mb-1">
                      Issuer
                    </h3>
                    <p className="text-sm text-[#131b2e]/60 leading-relaxed">
                      I want to deploy a smart contract and raise capital for my
                      enterprise.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500 flex flex-col items-center text-center py-6">
              <div className="size-20 rounded-full bg-[#f2f3ff] flex items-center justify-center border-8 border-[#ffffff] shadow-[0_8px_24px_rgba(19,27,46,0.05)]">
                <Fingerprint className="size-8 text-[#004ac6]" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight text-[#131b2e]">
                  Verify Professional ID
                </h2>
                <p className="text-[#131b2e]/60 text-sm max-w-sm mx-auto leading-relaxed">
                  You are registering as an{' '}
                  <strong className="text-[#131b2e] capitalize">
                    {selectedRole}
                  </strong>
                  . Verify your LinkedIn profile for KYC compliance. Your data remains private via zero-knowledge proofs.
                </p>
              </div>

              <div className="pt-4 w-full max-w-xs">
                <ReclaimVerification onSuccess={handleReclaimSuccess} />
              </div>

              <button
                onClick={() => setSelectedRole(null)}
                className="text-xs font-bold text-[#131b2e]/40 hover:text-[#131b2e]/80 uppercase tracking-widest transition-colors mt-4 disabled:opacity-50"
                disabled={isProcessing}
              >
                Change Role
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
