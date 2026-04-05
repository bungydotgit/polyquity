import { createServerFn } from '@tanstack/react-start'
import { db } from '../db' // Adjust path to your Drizzle export
import { investments } from '../db/schema' // Adjust path to your schema
import { eq, and, inArray, sql } from 'drizzle-orm'

export const getInvestorStats = createServerFn({ method: 'GET' })
  .inputValidator((input: { walletAddress: string }) => input)
  .handler(async ({ data }) => {
    const wallet = data.walletAddress.toLowerCase()

    // 1. Count Active Bids (Only 'locked' status)
    const activeBidsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(investments)
      .where(
        and(
          eq(investments.investorWallet, wallet),
          eq(investments.status, 'locked'),
        ),
      )

    // 2. Sum Total Capital Deployed ('locked' and 'claimed' status)
    // We do NOT include 'refunded' because that capital was returned!
    const deployedResult = await db
      .select({
        // Safely cast the varchar to numeric to perform math in Postgres
        total: sql<string>`COALESCE(SUM(CAST(${investments.amountWei} AS NUMERIC)), 0)`,
      })
      .from(investments)
      .where(
        and(
          eq(investments.investorWallet, wallet),
          inArray(investments.status, ['locked', 'claimed']),
        ),
      )

    return {
      activeBids: Number(activeBidsResult[0]?.count || 0),
      totalDeployedWei: deployedResult[0]?.total || '0',
    }
  })
