import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
} from '@/components/ui/navigation-menu'
import { Separator } from '@/components/ui/separator'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { WalletConnectButton } from '@/components/wallet-connect-button'

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  const navLinks = [
    { label: 'Platform', href: '#platform', active: true },
    { label: 'Compliance', href: '#compliance' },
    { label: 'Solutions', href: '#solutions' },
    { label: 'Resources', href: '#resources' },
  ]

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-ghost">
      <nav className="mx-auto max-w-7xl flex items-center justify-between px-6 py-3 lg:px-8">
        {/* Logo */}
        <a
          href="/"
          className="font-display text-xl font-bold tracking-display text-on-surface"
        >
          Polyquity
        </a>

        {/* Desktop navigation using shadcn NavigationMenu */}
        <NavigationMenu className="hidden md:flex">
          <NavigationMenuList className="gap-0.5">
            {navLinks.map((link) => (
              <NavigationMenuItem key={link.label}>
                <NavigationMenuLink
                  href={link.href}
                  className={cn(
                    'flex-row! px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                    link.active
                      ? 'bg-primary text-on-primary hover:bg-primary/90! hover:text-on-primary! focus:bg-primary/90! focus:text-on-primary!'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low',
                  )}
                >
                  {link.label}
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        {/* Right side actions */}
        <div className="hidden md:flex items-center gap-3">
          <WalletConnectButton />
        </div>

        {/* Mobile hamburger using shadcn Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden rounded-xl"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden glass border-t border-ghost px-6 py-4 space-y-2">
          {navLinks.map((link) => (
            <Button
              key={link.label}
              variant={link.active ? 'default' : 'ghost'}
              className={cn(
                'w-full justify-start rounded-xl',
                link.active
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant',
              )}
              asChild
            >
              <a href={link.href}>{link.label}</a>
            </Button>
          ))}
          <Separator className="my-3! bg-outline-variant/20" />
          <WalletConnectButton fullWidth />
        </div>
      )}
    </header>
  )
}
