import { createServerFn } from '@tanstack/react-start'
import { db } from '../db'
import { users } from '../db/schema'
import { eq } from 'drizzle-orm'
import type { NewUser } from '../db/schema'

export const getUser = createServerFn({ method: 'GET' })
  .inputValidator((input: { walletAddress: string }) => input)
  .handler(async ({ data }) => {
    const result = await db.query.users.findFirst({
      where: eq(users.walletAddress, data.walletAddress.toLowerCase()),
      with: { kycVerifications: true, company: true },
    })
    return result ?? null
  })

export const registerUser = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: {
      walletAddress: string
      displayName?: string
      email?: string
      role: 'investor' | 'issuer'
    }) => input,
  )
  .handler(async ({ data }) => {
    const newUser: NewUser = {
      walletAddress: data.walletAddress.toLowerCase(),
      displayName: data.displayName ?? null,
      email: data.email ?? null,
      role: data.role,
    }
    const [inserted] = await db.insert(users).values(newUser).returning()
    return inserted
  })

export const updateUser = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: { walletAddress: string; displayName?: string; email?: string }) =>
      input,
  )
  .handler(async ({ data }) => {
    const updates: Record<string, unknown> = { updatedAt: new Date() }
    if (data.displayName !== undefined) updates.displayName = data.displayName
    if (data.email !== undefined) updates.email = data.email

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.walletAddress, data.walletAddress.toLowerCase()))
      .returning()

    return updated ?? null
  })
