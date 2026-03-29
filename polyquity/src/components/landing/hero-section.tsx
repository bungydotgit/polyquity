import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

export function HeroSection() {
  return (
    <section className="relative pt-28 pb-16 lg:pt-36 lg:pb-24 overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text content */}
          <div className="space-y-8">
            <Badge className="bg-secondary-container text-on-secondary-container border-none px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase">
              ✦ Institutional-Grade DeFi
            </Badge>

            <h1 className="font-display text-5xl md:text-6xl lg:text-[4.25rem] font-extrabold leading-[1.05] tracking-display text-on-surface">
              Tokenized
              <br />
              Equity.
              <br />
              <span className="text-primary">
                Institutional
                <br />
                Trust.
              </span>
            </h1>

            <p className="text-on-surface-variant text-base lg:text-lg leading-relaxed max-w-lg">
              The compliance-first platform for Web3 Initial Public Offerings.
              Verified investors, immutable cap tables, and seamless capital
              formation for the modern enterprise.
            </p>

            <div className="flex flex-wrap gap-4">
              <Button
                size="lg"
                className="bg-gradient-primary text-on-primary rounded-xl font-semibold shadow-ambient h-12 px-7 gap-2"
              >
                Explore Offerings
                <ArrowRight className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="bg-surface-container-high text-primary rounded-xl font-semibold border-ghost h-12 px-7 hover:bg-surface-container"
              >
                Raise Capital
              </Button>
            </div>

            {/* Trusted by logos */}
            <div className="pt-6">
              <p className="text-xs font-semibold text-on-surface-variant/50 uppercase tracking-widest mb-4">
                Trusted by
              </p>
              <div className="flex items-center gap-8 flex-wrap">
                {['FINMA+', 'SEC-V', 'BLOCKSTREAM'].map((name) => (
                  <span
                    key={name}
                    className="font-display text-xl font-black italic text-on-surface-variant/40 tracking-wide"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Hero visual + Live offering card */}
          <div className="relative">
            {/* Abstract visual using Card container */}
            <Card className="rounded-2xl overflow-hidden shadow-ambient-lg border-none p-0">
              <CardContent className="p-0">
                <img
                  src="/hero-visual.png"
                  alt="Polyquity tokenized equity visualization"
                  className="w-full h-auto object-cover aspect-[4/3]"
                />
              </CardContent>
            </Card>

            {/* Floating live offering card */}
            <Card className="absolute -bottom-8 left-4 right-4 lg:left-6 lg:right-6 rounded-2xl shadow-ambient-lg border-ghost backdrop-blur-lg backdrop-brightness-110">
              <CardHeader className="p-5 pb-0">
                <div className="flex items-center justify-between">
                  <Badge className="bg-primary text-on-primary px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border-none">
                    Live Offering
                  </Badge>
                  <span className="text-[10px] text-on-surface-variant font-medium uppercase tracking-wider">
                    Ends in 5 days
                  </span>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-0 pt-3">
                <CardTitle className="font-display text-base font-bold text-on-surface">
                  QuantX Infrastructure Ltd.
                </CardTitle>
              </CardContent>
              <CardFooter className="flex-col items-stretch gap-2 px-5 pb-5 pt-3">
                <Progress
                  value={74}
                  className="h-1.5 bg-surface-container-low [&>div]:bg-gradient-primary"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-on-surface-variant font-medium">
                    $14.8M raised
                  </span>
                  <span className="text-xs font-bold text-primary">
                    74% of target
                  </span>
                </div>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}
