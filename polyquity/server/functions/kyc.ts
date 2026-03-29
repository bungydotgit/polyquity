import { createServerFn } from '@tanstack/react-start'
import { db } from '../db'
import { kycVerifications, users } from '../db/schema'
import { eq } from 'drizzle-orm'
import type { NewKycVerification } from '../db/schema'

// ─── Record a KYC verification after on-chain tx confirms ───────────────────

export const recordKycVerification = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: {
      walletAddress: string
      txHash: string
      chainId: number
      signature: string
    }) => input,
  )
  .handler(async ({ data }) => {
    const wallet = data.walletAddress.toLowerCase()

    // Find the user
    const user = await db.query.users.findFirst({
      where: eq(users.walletAddress, wallet),
    })

    if (!user) {
      throw new Error('User not found. Please register first.')
    }

    // Insert KYC record
    const newKyc: NewKycVerification = {
      userId: user.id,
      txHash: data.txHash,
      chainId: data.chainId,
      signature: data.signature,
    }

    const [inserted] = await db
      .insert(kycVerifications)
      .values(newKyc)
      .returning()

    // Update user's kyc_verified_at
    await db
      .update(users)
      .set({ kycVerifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, user.id))

    return inserted
  })

// ─── Get KYC status for a wallet ────────────────────────────────────────────

export const getKycStatus = createServerFn({ method: 'GET' })
  .inputValidator((input: { walletAddress: string }) => input)
  .handler(async ({ data }) => {
    const user = await db.query.users.findFirst({
      where: eq(users.walletAddress, data.walletAddress.toLowerCase()),
      with: { kycVerifications: true },
    })

    if (!user) {
      return { registered: false, verified: false, verifications: [] }
    }

    return {
      registered: true,
      verified: user.kycVerifiedAt !== null,
      verifiedAt: user.kycVerifiedAt,
      verifications: user.kycVerifications,
    }
  })
