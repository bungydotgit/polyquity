import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAccount } from 'wagmi'
import { Building2, UserCircle, Loader2 } from 'lucide-react'
import { onboardUser } from '../../server/functions/users'
import { Web3Guard, invalidateAuthCache } from '@/Auth/components/web3-guard'

export const Route = createFileRoute('/onboarding')({
  component: OnboardingFlow,
})

function OnboardingFlow() {
  const { address } = useAccount()
  const navigate = useNavigate()

  // General User State
  const [role, setRole] = useState<'investor' | 'issuer' | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')

  // Company State (Only used if role === 'issuer')
  const [companyName, setCompanyName] = useState('')
  const [companyDescription, setCompanyDescription] = useState('')
  const [website, setWebsite] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!address) return alert('Please connect your wallet first.')
    if (!role) return alert('Please select a role.')
    if (!displayName.trim()) return alert('Please enter your name.')

    // Validate Issuer-specific requirements
    if (role === 'issuer' && !companyName.trim()) {
      return alert('Company name is required for Issuers.')
    }

    setIsSubmitting(true)
    try {
      await onboardUser({
        data: {
          walletAddress: address,
          role: role,
          displayName: displayName.trim(),
          email: email.trim() || undefined,
          companyName: role === 'issuer' ? companyName.trim() : undefined,
          companyDescription:
            role === 'issuer' ? companyDescription.trim() : undefined,
          website: role === 'issuer' ? website.trim() : undefined,
        },
      })

      // Clear the auth cache so the dashboard guard sees the new user.
      if (address) invalidateAuthCache(address)

      // Route them to their specific dashboard
      navigate({ to: role === 'investor' ? '/investor' : '/issuer' })
    } catch (error) {
      console.error(error)
      alert(
        'Failed to create profile. Your wallet might already be registered.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Web3Guard allowedRole="onboarding">
      <div className="min-h-screen bg-[#faf8ff] text-[#131b2e] font-sans selection:bg-[#004ac6]/20 py-12 px-6">
        <main className="w-full max-w-2xl mx-auto space-y-10">
          <div className="text-center space-y-3">
            <h1 className="text-4xl font-extrabold tracking-tight">
              Complete Your Profile
            </h1>
            <p className="text-[#131b2e]/60 text-lg">
              Link your wallet{' '}
              <span className="font-mono text-sm bg-gray-200 px-2 py-1 rounded-md">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </span>{' '}
              to your identity.
            </p>
          </div>

          <div className="bg-[#ffffff] p-8 md:p-10 rounded-2xl shadow-[0_24px_40px_rgba(19,27,46,0.05)] border border-[#c3c6d7]/20 space-y-8">
            {/* 1. Role Selection */}
            <div className="space-y-4">
              <label className="block text-sm font-bold text-[#131b2e]/60 uppercase tracking-wide">
                I want to...
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setRole('investor')}
                  className={`flex items-center gap-4 p-5 rounded-xl border-2 transition-all duration-200 text-left ${
                    role === 'investor'
                      ? 'border-[#004ac6] bg-[#f2f3ff] shadow-sm'
                      : 'border-[#c3c6d7]/30 bg-white'
                  }`}
                >
                  <div
                    className={`p-2.5 rounded-lg ${role === 'investor' ? 'bg-[#004ac6] text-white' : 'bg-gray-100 text-gray-500'}`}
                  >
                    <UserCircle className="size-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Invest</h3>
                    <p className="text-xs font-medium text-[#131b2e]/60">
                      Deploy capital
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => setRole('issuer')}
                  className={`flex items-center gap-4 p-5 rounded-xl border-2 transition-all duration-200 text-left ${
                    role === 'issuer'
                      ? 'border-[#004ac6] bg-[#f2f3ff] shadow-sm'
                      : 'border-[#c3c6d7]/30 bg-white'
                  }`}
                >
                  <div
                    className={`p-2.5 rounded-lg ${role === 'issuer' ? 'bg-[#004ac6] text-white' : 'bg-gray-100 text-gray-500'}`}
                  >
                    <Building2 className="size-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Raise Capital</h3>
                    <p className="text-xs font-medium text-[#131b2e]/60">
                      Issue an IPO
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* 2. Standard User Details */}
            {role && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-[#131b2e]/60 uppercase">
                      Your Name
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full bg-[#f2f3ff] border border-[#c3c6d7]/50 rounded-xl px-4 py-3 focus:outline-none focus:border-[#004ac6]/50 focus:ring-2 focus:ring-[#004ac6]/20 font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-[#131b2e]/60 uppercase">
                      Email (Optional)
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jane@example.com"
                      className="w-full bg-[#f2f3ff] border border-[#c3c6d7]/50 rounded-xl px-4 py-3 focus:outline-none focus:border-[#004ac6]/50 focus:ring-2 focus:ring-[#004ac6]/20 font-medium"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 3. Company Details (Only if Issuer) */}
            {role === 'issuer' && (
              <div className="space-y-4 pt-6 border-t border-[#c3c6d7]/20 animate-in fade-in slide-in-from-top-4 duration-500">
                <h3 className="text-xl font-bold">Company Profile</h3>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-[#131b2e]/60 uppercase">
                    Registered Company Name *
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. QuantX Infrastructure Ltd."
                    className="w-full bg-[#f2f3ff] border border-[#c3c6d7]/50 rounded-xl px-4 py-3 focus:outline-none focus:border-[#004ac6]/50 focus:ring-2 focus:ring-[#004ac6]/20 font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-[#131b2e]/60 uppercase">
                    Short Description
                  </label>
                  <textarea
                    value={companyDescription}
                    onChange={(e) => setCompanyDescription(e.target.value)}
                    placeholder="What does your company do?"
                    rows={3}
                    className="w-full bg-[#f2f3ff] border border-[#c3c6d7]/50 rounded-xl px-4 py-3 focus:outline-none focus:border-[#004ac6]/50 focus:ring-2 focus:ring-[#004ac6]/20 font-medium resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-[#131b2e]/60 uppercase">
                    Website URL
                  </label>
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-[#f2f3ff] border border-[#c3c6d7]/50 rounded-xl px-4 py-3 focus:outline-none focus:border-[#004ac6]/50 focus:ring-2 focus:ring-[#004ac6]/20 font-medium"
                  />
                </div>
              </div>
            )}

            {/* Submit Action */}
            <div className="pt-6">
              <button
                onClick={handleSubmit}
                disabled={
                  !role ||
                  !displayName ||
                  (role === 'issuer' && !companyName) ||
                  isSubmitting
                }
                className="w-full bg-gradient-to-br from-[#004ac6] to-[#2563eb] text-white rounded-xl py-4 px-6 font-bold text-lg shadow-[0_8px_16px_rgba(0,74,198,0.15)] hover:shadow-[0_12px_24px_rgba(0,74,198,0.25)] hover:-translate-y-0.5 transition-all active:scale-[0.98] flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {isSubmitting ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  'Complete Registration'
                )}
              </button>
            </div>
          </div>
        </main>
      </div>
    </Web3Guard>
  )
}
