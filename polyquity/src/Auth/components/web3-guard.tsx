import { useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAccount } from 'wagmi'
import { Loader2 } from 'lucide-react'
import { getUser } from '../../../server/functions/users'

// ─── Module-level auth cache ──────────────────────────────────────────────────
// useRef/useState reset every time a component unmounts (i.e. on every route
// change). We need the auth result to persist across navigations so the guard
// on /investor doesn't re-query the DB immediately after the guard on
// /onboarding already verified the user and redirected there.
//
// Keyed by wallet address (lowercase), value is the user's role or 'unknown'.
type AuthResult = 'investor' | 'issuer' | 'unknown'
const authCache = new Map<string, AuthResult>()

// Track in-flight requests so concurrent guards don't double-fetch.
const inflight = new Map<string, Promise<AuthResult>>()

async function resolveRole(address: string): Promise<AuthResult> {
  const key = address.toLowerCase()

  if (authCache.has(key)) return authCache.get(key)!

  if (inflight.has(key)) return inflight.get(key)!

  const promise = getUser({ data: { walletAddress: key } }).then((user) => {
    const result: AuthResult = user ? (user.role as AuthResult) : 'unknown'
    authCache.set(key, result)
    inflight.delete(key)
    return result
  })

  inflight.set(key, promise)
  return promise
}

/** Call this after a successful onboarding so the cache reflects the new user. */
export function invalidateAuthCache(address: string) {
  authCache.delete(address.toLowerCase())
}

// ─── Web3Guard ────────────────────────────────────────────────────────────────

interface Web3GuardProps {
  children: React.ReactNode
  allowedRole?: 'investor' | 'issuer' | 'onboarding'
}

export function Web3Guard({ children, allowedRole }: Web3GuardProps) {
  const { address, isConnected, isConnecting, isReconnecting } = useAccount()
  const navigate = useNavigate()
  const navigateRef = useRef(navigate)
  // Keep navigateRef current without adding navigate to effect deps.
  navigateRef.current = navigate

  const [status, setStatus] = useState<'loading' | 'authorized' | 'done'>(
    'loading',
  )

  useEffect(() => {
    // Wagmi hasn't settled yet — wait.
    if (isConnecting || isReconnecting) return

    let cancelled = false
    const go = (to: string) => {
      if (!cancelled) navigateRef.current({ to: to as '/' })
    }

    async function check() {
      // No wallet connected.
      if (!isConnected || !address) {
        if (allowedRole !== 'onboarding') {
          go('/')
        } else {
          // Onboarding page: render it and let the user connect inside.
          if (!cancelled) setStatus('authorized')
        }
        return
      }

      const role = await resolveRole(address)

      if (cancelled) return

      if (role === 'unknown') {
        // User not in DB.
        if (allowedRole === 'onboarding') {
          setStatus('authorized')
        } else {
          go('/onboarding')
        }
        return
      }

      // User exists in DB.
      if (allowedRole === 'onboarding') {
        // Already registered — skip onboarding.
        go(role === 'investor' ? '/investor' : '/issuer')
        return
      }

      if (allowedRole && role !== allowedRole) {
        // Wrong dashboard.
        go(role === 'investor' ? '/investor' : '/issuer')
        return
      }

      // All clear.
      setStatus('authorized')
    }

    check().catch((err) => {
      console.error('Web3Guard check failed:', err)
      if (!cancelled) setStatus('authorized') // fail open so user isn't stuck
    })

    return () => {
      cancelled = true
    }
    // allowedRole is stable per page. isConnected/address drive re-checks when
    // wallet changes. isConnecting/isReconnecting are guards, not triggers.
  }, [isConnected, isConnecting, isReconnecting, address, allowedRole])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#faf8ff] flex flex-col items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#004ac6]" />
        <p className="mt-4 text-[#131b2e]/60 font-medium animate-pulse">
          {isConnecting || isReconnecting
            ? 'Connecting to wallet...'
            : 'Verifying identity...'}
        </p>
      </div>
    )
  }

  return <>{children}</>
}
