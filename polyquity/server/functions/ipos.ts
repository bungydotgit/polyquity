import { createServerFn } from '@tanstack/react-start'
import { db } from '../db'
import { ipos } from '../db/schema'
import { eq, desc, and, sql } from 'drizzle-orm'
import type { NewIpo } from '../db/schema'

export const getIPOs = createServerFn({ method: 'GET' })
  .inputValidator(
    (input: {
      status?: 'upcoming' | 'active' | 'finalized' | 'cancelled'
      page?: number
      limit?: number
    }) => input,
  )
  .handler(async ({ data }) => {
    const page = Number(data.page ?? 1)
    const limit = Number(data.limit ?? 12)
    const offset = (page - 1) * limit

    const conditions = []
    if (data.status) {
      conditions.push(eq(ipos.status, data.status))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const [results, countResult] = await Promise.all([
      db.query.ipos.findMany({
        where: whereClause,
        with: { company: true },
        orderBy: [desc(ipos.createdAt)],
        limit,
        offset,
      }),
      db
        .select({ count: sql<number>`count(*)` })
        .from(ipos)
        .where(whereClause),
    ])

    return {
      ipos: results,
      total: Number(countResult[0]?.count ?? 0),
      page,
      limit,
      totalPages: Math.ceil(Number(countResult[0]?.count ?? 0) / limit),
    }
  })

export const getIPO = createServerFn({ method: 'GET' })
  .inputValidator((input: { contractAddress: string }) => input)
  .handler(async ({ data }) => {
    const result = await db.query.ipos.findFirst({
      where: eq(ipos.contractAddress, data.contractAddress.toLowerCase()),
      with: { company: true },
    })
    return result ?? null
  })

export const recordIPO = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: {
      contractAddress: string
      issuerWallet: string
      companyId?: string
      tokenName: string
      tokenSymbol: string
      ipfsDocCid?: string
      startTime: string
      endTime: string
      pricePerToken: string
      totalTokens: string
    }) => input,
  )
  .handler(async ({ data }) => {
    const newIpo: NewIpo = {
      contractAddress: data.contractAddress.toLowerCase(),
      issuerWallet: data.issuerWallet.toLowerCase(),
      companyId: data.companyId ?? null,
      tokenName: data.tokenName,
      tokenSymbol: data.tokenSymbol,
      ipfsDocCid: data.ipfsDocCid ?? null,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
      pricePerToken: data.pricePerToken,
      totalTokens: data.totalTokens,
      status: 'upcoming',
    }
    const [inserted] = await db.insert(ipos).values(newIpo).returning()
    return inserted
  })

export const updateIPOStatus = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: {
      contractAddress: string
      status: 'upcoming' | 'active' | 'finalized' | 'cancelled'
      totalRaised?: string
    }) => input,
  )
  .handler(async ({ data }) => {
    const updates: Record<string, unknown> = {
      status: data.status,
      updatedAt: new Date(),
    }
    if (data.totalRaised !== undefined) {
      updates.totalRaised = data.totalRaised
    }

    const [updated] = await db
      .update(ipos)
      .set(updates)
      .where(eq(ipos.contractAddress, data.contractAddress.toLowerCase()))
      .returning()

    return updated ?? null
  })
