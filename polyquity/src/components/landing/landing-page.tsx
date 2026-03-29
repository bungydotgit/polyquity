import { Navbar } from '@/components/landing/navbar'
import { HeroSection } from '@/components/landing/hero-section'
import { ComplianceSection } from '@/components/landing/compliance-section'
import { GovernanceSection } from '@/components/landing/governance-sections'
import { CTASection } from '@/components/landing/cta-section'
import { Footer } from '@/components/landing/footer'

export default function LandingPage() {
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
