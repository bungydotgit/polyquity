import { createServerFn } from '@tanstack/react-start'
import { db } from '../db'
import { companies } from '../db/schema'
import { eq } from 'drizzle-orm'
import type { NewCompany } from '../db/schema'

export const getCompany = createServerFn({ method: 'GET' })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    const result = await db.query.companies.findFirst({
      where: eq(companies.id, data.id),
      with: { ipos: true },
    })
    return result ?? null
  })

export const getCompanyByWallet = createServerFn({ method: 'GET' })
  .inputValidator((input: { walletAddress: string }) => input)
  .handler(async ({ data }) => {
    const result = await db.query.companies.findFirst({
      where: eq(companies.ownerWallet, data.walletAddress.toLowerCase()),
      with: { ipos: true },
    })
    return result ?? null
  })

export const registerCompany = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: {
      ownerWallet: string
      name: string
      description?: string
      registrationNumber?: string
      website?: string
    }) => input,
  )
  .handler(async ({ data }) => {
    const newCompany: NewCompany = {
      ownerWallet: data.ownerWallet.toLowerCase(),
      name: data.name,
      description: data.description ?? null,
      registrationNumber: data.registrationNumber ?? null,
      website: data.website ?? null,
    }
    const [inserted] = await db.insert(companies).values(newCompany).returning()
    return inserted
  })

export const updateCompany = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: {
      id: string
      name?: string
      description?: string
      registrationNumber?: string
      website?: string
      logoIpfsCid?: string
    }) => input,
  )
  .handler(async ({ data }) => {
    const updates: Record<string, unknown> = { updatedAt: new Date() }
    if (data.name !== undefined) updates.name = data.name
    if (data.description !== undefined) updates.description = data.description
    if (data.registrationNumber !== undefined)
      updates.registrationNumber = data.registrationNumber
    if (data.website !== undefined) updates.website = data.website
    if (data.logoIpfsCid !== undefined) updates.logoIpfsCid = data.logoIpfsCid

    const [updated] = await db
      .update(companies)
      .set(updates)
      .where(eq(companies.id, data.id))
      .returning()

    return updated ?? null
  })
