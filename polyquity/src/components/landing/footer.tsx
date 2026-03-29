import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from '@/components/ui/navigation-menu'

export function Footer() {
  const footerLinks = [
    { label: 'Terms of Service', href: '#' },
    { label: 'Privacy Policy', href: '#' },
    { label: 'Security Audit', href: '#' },
    { label: 'Contact', href: '#' },
  ]

  return (
    <footer className="bg-surface-container-low py-8">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-display text-base font-bold text-on-surface">
              Polyquity
            </p>
            <p className="text-xs text-on-surface-variant mt-1">
              © 2025 Polyquity. Institutional DeFi Compliance.
            </p>
          </div>
          <NavigationMenu>
            <NavigationMenuList className="gap-4">
              {footerLinks.map((link) => (
                <NavigationMenuItem key={link.label}>
                  <NavigationMenuLink
                    href={link.href}
                    className="text-xs text-on-surface-variant hover:text-on-surface transition-colors p-0 !bg-transparent hover:!bg-transparent"
                  >
                    {link.label}
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
        </div>
      </div>
    </footer>
  )
}
