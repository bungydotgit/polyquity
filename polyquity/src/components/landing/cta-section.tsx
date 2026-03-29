import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export function CTASection() {
  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <Card className="bg-gradient-primary rounded-3xl border-none relative overflow-hidden">
          {/* Subtle decorative circles */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-56 h-56 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

          <CardContent className="px-8 py-16 lg:px-16 lg:py-20 text-center relative z-10">
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-display text-on-primary leading-tight mb-4">
              Ready to evolve your capital
              <br />
              structure?
            </h2>
            <p className="text-on-primary/70 text-base lg:text-lg max-w-xl mx-auto mb-10">
              Join 500+ institutional investors and 40+ leading enterprises
              tokenizing the future of finance.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button
                size="lg"
                className="bg-surface-container-lowest text-primary rounded-xl font-semibold shadow-ambient hover:bg-white h-12 px-7"
              >
                Get Started
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="bg-transparent text-on-primary rounded-xl font-semibold border-white/30 hover:bg-white/10 hover:text-on-primary h-12 px-7"
              >
                Schedule Demo
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
