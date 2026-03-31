import { Navbar } from '@/components/landing/navbar'
import { HeroSection } from '@/components/landing/hero-section'
import { ComplianceSection } from '@/components/landing/compliance-section'
import { GovernanceSection } from '@/components/landing/governance-sections'
import { CTASection } from '@/components/landing/cta-section'
import { Footer } from '@/components/landing/footer'
import { useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useNavigate } from '@tanstack/react-router'

export default function LandingPage() {
  const { isConnected, isConnecting, isReconnecting } = useAccount()
  const navigate = useNavigate()

  useEffect(() => {
    // Wait until Wagmi has fully settled before acting.
    if (isConnecting || isReconnecting) return

    if (isConnected) {
      // Send connected wallets to onboarding.
      // Web3Guard there will redirect known users straight to their dashboard,
      // and show the registration form to new users.
      navigate({ to: '/onboarding', replace: true })
    }
  }, [isConnected, isConnecting, isReconnecting, navigate])

  return (
    <div className="min-h-screen bg-surface text-on-surface antialiased">
      <Navbar />
      <main>
        <HeroSection />
        <ComplianceSection />
        <GovernanceSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}
