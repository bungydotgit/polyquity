import { createServerFn } from '@tanstack/react-start'
import { db } from '../db'
import { users, companies } from '../db/schema'
import { eq } from 'drizzle-orm'

export const onboardUser = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: {
      walletAddress: string
      role: 'investor' | 'issuer'
      displayName: string
      email?: string
      companyName?: string
      companyDescription?: string
      website?: string
      registrationNumber?: string
    }) => input,
  )
  .handler(async ({ data }) => {
    const wallet = data.walletAddress.toLowerCase()

    return await db.transaction(async (tx) => {
      // 1. Create the user
      const [newUser] = await tx
        .insert(users)
        .values({
          walletAddress: wallet,
          displayName: data.displayName,
          email: data.email ?? null,
          role: data.role,
        })
        .returning()

      // 2. If issuer, create the company profile
      if (data.role === 'issuer' && data.companyName) {
        await tx.insert(companies).values({
          ownerWallet: wallet,
          name: data.companyName,
          description: data.companyDescription ?? null,
          website: data.website ?? null,
          registrationNumber: data.registrationNumber ?? null,
        })
      }

      return newUser
    })
  })

export const getUser = createServerFn({ method: 'GET' })
  .inputValidator((input: { walletAddress: string }) => input)
  .handler(async ({ data }) => {
    // We lowercase the wallet address to ensure EVM checksums don't create duplicate accounts
    const result = await db.query.users.findFirst({
      where: eq(users.walletAddress, data.walletAddress.toLowerCase()),
      with: { company: true }, // Eager load the company profile if they are an issuer
    })
    return result ?? null
  })
