import { useEffect } from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { useAccount } from 'wagmi'

interface AuthGuardProps {
  children: React.ReactNode
}

const publicRoutes = ['/']
const protectedRoutes = ['/investor', '/issuer']

export function AuthGuard({ children }: AuthGuardProps) {
  const { status } = useAccount()
  const navigate = useNavigate()
  const location = useLocation()

  const currentPath = location.pathname

  useEffect(() => {
    // Wait for wagmi to settle
    if (status === 'connecting' || status === 'reconnecting') {
      return
    }

    const isProtected = protectedRoutes.some((route) =>
      currentPath.startsWith(route),
    )
    const isOnboarding = currentPath === '/onboarding'
    const isPublic = publicRoutes.includes(currentPath)

    // Rule 1: No wallet connected -> Kick back to landing page
    if (status === 'disconnected') {
      if (isOnboarding || isProtected) {
        navigate({ to: '/', replace: true })
      }
      return
    }

    // DEV MODE HACK: We assume anyone connected is fully verified.
    // If they are on the landing page or onboarding, shove them straight to the investor dashboard.
    if (status === 'connected' && (isPublic || isOnboarding)) {
      navigate({ to: '/investor', replace: true })
    }
  }, [status, currentPath, navigate])

  // Show spinner ONLY while wallet is connecting (No KYC loading anymore)
  if (status === 'connecting' || status === 'reconnecting') {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-surface text-on-surface">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-4 text-sm font-medium text-on-surface-variant animate-pulse">
          Connecting wallet...
        </p>
      </div>
    )
  }

  return <>{children}</>
}
