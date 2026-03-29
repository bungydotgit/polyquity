import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export type IPOStatus = 'UPCOMING' | 'ACTIVE' | 'FINALIZED'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatAvax(weiString: string): string {
  const wei = BigInt(weiString)
  const avax = Number(wei) / 1e18
  return avax.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function shortenAddress(address: string): string {
  if (!address || address.length < 10) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function getTimeRemaining(
  endTime: number,
): { days: number; hours: number; minutes: number; seconds: number } | null {
  const now = Math.floor(Date.now() / 1000)
  const diff = endTime - now

  if (diff <= 0) return null

  const days = Math.floor(diff / 86400)
  const hours = Math.floor((diff % 86400) / 3600)
  const minutes = Math.floor((diff % 3600) / 60)
  const seconds = diff % 60

  return { days, hours, minutes, seconds }
}

export function getRaisePercentage(raised: string, hardCap: string): number {
  const raisedWei = BigInt(raised)
  const hardCapWei = BigInt(hardCap)

  if (hardCapWei === 0n) return 0

  const percentage = (Number(raisedWei) / Number(hardCapWei)) * 100
  return Math.min(Math.round(percentage * 100) / 100, 100)
}

export function getStatusColor(status: IPOStatus): string {
  switch (status) {
    case 'UPCOMING':
      return 'text-amber-400'
    case 'ACTIVE':
      return 'text-green-400'
    case 'FINALIZED':
      return 'text-white/40'
    default:
      return 'text-white/40'
  }
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
