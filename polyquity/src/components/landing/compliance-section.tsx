import { FileText, Lock, ShieldCheck } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function ComplianceSection() {
  const features = [
    {
      icon: ShieldCheck,
      title: 'Zero-Knowledge KYC',
      description:
        'Verify investor credentials without exposing sensitive personal data. Polyquity uses ZK proofs to ensure 100% compliance while preserving complete privacy.',
    },
    {
      icon: FileText,
      title: 'Immutable Prospectus',
      description:
        'Every legal document and offering circular is stored on the blockchain, ensuring a permanent, tamperproof audit trail for regulators and stakeholders.',
    },
    {
      icon: Lock,
      title: 'Automated Escrow',
      description:
        'Smart contract-based capital custody ensures funds are only released to issuers once compliance milestones and minimum funding targets are automatically met.',
    },
  ]

  return (
    <section
      id="compliance"
      className="py-24 lg:py-32 bg-surface-container-low"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="font-display text-3xl md:text-4xl font-extrabold tracking-display text-on-surface mb-4">
            Protocol-Level Compliance
          </h2>
          <p className="text-on-surface-variant text-base leading-relaxed">
            We bridge the gap between decentralized finance and traditional
            regulatory frameworks through high-fidelity smart contracts.
          </p>
        </div>

        {/* Feature cards using shadcn Card */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="bg-surface-container-lowest rounded-2xl shadow-ambient border-none transition-all duration-300 hover:-translate-y-1 hover:shadow-ambient-lg group"
            >
              <CardHeader className="pb-0">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary/10 mb-2">
                  <feature.icon className="size-6 text-primary" />
                </div>
                <CardTitle className="font-display text-lg font-bold text-on-surface">
                  {feature.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-on-surface-variant text-sm leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
