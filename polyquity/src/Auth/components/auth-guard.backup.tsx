import { useEffect } from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { useAccount } from 'wagmi'
import { useQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { getKycStatus } from 'server/functions/kyc'

interface AuthGuardProps {
  children: React.ReactNode
}

const publicRoutes = ['/']
const protectedRoutes = ['/investor', '/issuer']

export function AuthGuard({ children }: AuthGuardProps) {
  const { status, address } = useAccount()
  const navigate = useNavigate()
  const location = useLocation()

  const getKycStatusFn = useServerFn(getKycStatus)

  // Only fetch when we have a connected wallet
  const { data: kycData, isLoading: kycLoading } = useQuery({
    queryKey: ['kyc-status', address],
    queryFn: () => getKycStatusFn({ data: { walletAddress: address! } }),
    enabled: !!address && status === 'connected',
    staleTime: 1000 * 60 * 5, // 5 min — avoid hammering on every render
  })

  const isVerified = kycData?.verified ?? false
  const currentPath = location.pathname

  useEffect(() => {
    // Wait for wagmi to settle AND KYC query to resolve
    if (
      status === 'connecting' ||
      status === 'reconnecting' ||
      (status === 'connected' && kycLoading)
    ) {
      return
    }

    const isProtected = protectedRoutes.some((route) =>
      currentPath.startsWith(route),
    )
    const isOnboarding = currentPath === '/onboarding'
    const isPublic = publicRoutes.includes(currentPath)

    // Rule 1: No wallet connected
    if (status === 'disconnected') {
      if (isOnboarding || isProtected) {
        navigate({ to: '/', replace: true })
      }
      return
    }

    // Rule 2: Connected but not KYC verified
    if (!isVerified) {
      if (isProtected) {
        navigate({ to: '/onboarding', replace: true })
      }
      return
    }

    // Rule 3: Connected + verified — keep off public/onboarding pages
    if (isPublic || isOnboarding) {
      navigate({ to: '/investor', replace: true })
    }
  }, [status, isVerified, kycLoading, currentPath, navigate])

  // Show spinner while wagmi is reconnecting OR KYC is loading
  if (
    status === 'connecting' ||
    status === 'reconnecting' ||
    (status === 'connected' && kycLoading)
  ) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-surface text-on-surface">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-4 text-sm font-medium text-on-surface-variant animate-pulse">
          Securing connection...
        </p>
      </div>
    )
  }

  return <>{children}</>
}
