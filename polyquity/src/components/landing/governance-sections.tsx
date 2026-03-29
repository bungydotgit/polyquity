import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

export function GovernanceSection() {
  const faqs = [
    {
      question: 'How is my identity verified?',
      answer:
        'Polyquity uses zero-knowledge proofs to verify your identity credentials. Your data is never stored on-chain — only a cryptographic proof of compliance. This ensures regulators can validate your status while your personal information remains private and secure.',
    },
    {
      question: 'What are the compliance standards?',
      answer:
        'We adhere to SEC Regulation D (506c), Regulation S for non-US investors, and MiFID II frameworks. Each offering is reviewed and structured to meet global securities regulations, ensuring institutional-grade compliance for both issuers and investors.',
    },
    {
      question: 'How are funds secured?',
      answer:
        'All funds are held in audited smart contract escrows on-chain. Funds cannot be released until predefined milestones are met — including minimum raise thresholds, KYC completion rates, and regulatory sign-offs. Multi-sig governance provides an additional layer of security.',
    },
  ]

  return (
    <section id="solutions" className="py-24 lg:py-32 bg-surface">
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-extrabold tracking-display text-on-surface italic">
            Governance & Safety
          </h2>
        </div>

        {/* FAQ Accordion using shadcn Accordion */}
        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="bg-surface-container-lowest rounded-2xl shadow-ambient border-none px-6 overflow-hidden"
            >
              <AccordionTrigger className="text-on-surface font-display font-semibold text-base py-5 hover:no-underline [&[data-state=open]>svg]:text-primary">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-on-surface-variant text-sm leading-relaxed pb-5">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
