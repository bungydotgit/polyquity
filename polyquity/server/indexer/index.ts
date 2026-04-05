import 'dotenv/config'
import { createPublicClient, http } from 'viem'
import { anvil } from 'viem/chains'
import { db } from '../db/index'
import { ipos, investments } from '../db/schema'
import { eq, and } from 'drizzle-orm'
import { POLY_IPO_ABI } from '../../src/lib/constants'

// Pull the factory address from your environment variables
const POLYFACTORY_ADDRESS = process.env.POLYFACTORY_ADDRESS as `0x${string}`

if (!POLYFACTORY_ADDRESS) {
  console.error(
    '❌ POLYFACTORY_ADDRESS environment variable is required in .env',
  )
  process.exit(1)
}

// The exact event signature from your PolyFactory contract
const IPOCreatedEvent = {
  type: 'event' as const,
  name: 'IPOCreated',
  inputs: [
    { name: 'ipo', type: 'address', indexed: true },
    { name: 'token', type: 'address', indexed: true },
    { name: 'companyWallet', type: 'address', indexed: true },
    { name: 'ipfsCID', type: 'string', indexed: false },
    { name: 'tokenName', type: 'string', indexed: false },
    { name: 'tokenSymbol', type: 'string', indexed: false },
    { name: 'softCap', type: 'uint256', indexed: false },
    { name: 'hardCap', type: 'uint256', indexed: false },
    { name: 'tokenPrice', type: 'uint256', indexed: false },
    { name: 'startTime', type: 'uint256', indexed: false },
    { name: 'endTime', type: 'uint256', indexed: false },
  ],
} as const

const client = createPublicClient({
  chain: anvil,
  transport: http('http://127.0.0.1:8545'),
})

async function handleIPOCreated(args: any) {
  const normalizedIpoAddress = args.ipo.toLowerCase()

  console.log(`\n🚨 [indexer] NEW IPO DETECTED ON-CHAIN!`)
  console.log(`Company: ${args.tokenName} (${args.tokenSymbol})`)
  console.log(`Contract: ${normalizedIpoAddress}`)

  try {
    const existing = await db.query.ipos.findFirst({
      where: (t, { eq }) => eq(t.contractAddress, normalizedIpoAddress),
    })

    if (existing) {
      console.log(
        `[indexer] IPO ${normalizedIpoAddress} already indexed, skipping.`,
      )
      return
    }

    await db.insert(ipos).values({
      contractAddress: normalizedIpoAddress,
      ipfsDocCid: args.ipfsCID,
      issuerWallet: args.companyWallet.toLowerCase(),
      tokenName: args.tokenName,
      tokenSymbol: args.tokenSymbol,
      startTime: new Date(Number(args.startTime) * 1000),
      endTime: new Date(Number(args.endTime) * 1000),
      pricePerToken: args.tokenPrice.toString(),
      totalTokens: args.hardCap.toString(),
      totalRaised: '0',
      status: 'active', // Mark it active right away
    })

    console.log(
      `✅ [indexer] Successfully indexed ${args.tokenSymbol} into Database!`,
    )
  } catch (error) {
    console.error(
      `❌ [indexer] Failed to index IPO ${normalizedIpoAddress}:`,
      error,
    )
  }
}

async function main() {
  console.log(`🎧 [indexer] Starting PolyFactory event indexer...`)
  console.log(`[indexer] Chain: ${anvil.name} (http://127.0.0.1:8545)`)
  console.log(`[indexer] PolyFactory address: ${POLYFACTORY_ADDRESS}`)

  // 1. WATCH FOR NEW IPOS
  client.watchContractEvent({
    address: POLYFACTORY_ADDRESS,
    abi: [IPOCreatedEvent],
    eventName: 'IPOCreated',
    onLogs: (logs) => {
      for (const log of logs) {
        if (log.args) handleIPOCreated(log.args).catch(console.error)
      }
    },
  })

  // 2. WATCH FOR NEW BIDS
  client.watchContractEvent({
    abi: POLY_IPO_ABI,
    eventName: 'BidPlaced',
    onLogs: async (logs) => {
      for (const log of logs) {
        try {
          const ipoAddress = log.address.toLowerCase()
          const txHash = log.transactionHash

          // @ts-ignore - Assuming args match the ABI
          const { bidder, accepted, totalRaised } = log.args

          // 1. Get the IPO ID from the DB
          const ipoRecord = await db.query.ipos.findFirst({
            where: eq(ipos.contractAddress, ipoAddress),
          })

          if (!ipoRecord) {
            console.error(
              `[indexer] Received bid for unknown IPO: ${ipoAddress}`,
            )
            continue
          }

          // 2. Insert the Investment Record
          await db.insert(investments).values({
            ipoId: ipoRecord.id,
            investorWallet: bidder!.toLowerCase(),
            amountWei: accepted!.toString(),
            txHash: txHash,
            status: 'locked',
          })

          // 3. Update the total raised on the IPO
          await db
            .update(ipos)
            .set({ totalRaised: totalRaised?.toString() })
            .where(eq(ipos.id, ipoRecord.id))

          console.log(
            `💰 [indexer] Bid recorded: ${accepted} wei from ${bidder}`,
          )
        } catch (err) {
          console.error('[indexer] Error processing bid event:', err)
        }
      }
    },
  })

  // 3. WATCH FOR IPO FINALIZATION
  client.watchContractEvent({
    abi: POLY_IPO_ABI,
    eventName: 'IPOFinalized',
    onLogs: async (logs) => {
      for (const log of logs) {
        try {
          const ipoAddress = log.address.toLowerCase()
          // @ts-ignore
          const newState = log.args.newState === 1 ? 'finalized' : 'cancelled'

          await db
            .update(ipos)
            .set({ status: newState })
            .where(eq(ipos.contractAddress, ipoAddress))

          console.log(
            `🏁 [indexer] IPO ${ipoAddress} ended with status: ${newState}`,
          )
        } catch (err) {
          console.error('[indexer] Error processing finalize event:', err)
        }
      }
    },
  })

  // 4. WATCH FOR CLAIMED TOKENS (SUCCESS PATH)
  client.watchContractEvent({
    abi: POLY_IPO_ABI,
    eventName: 'TokensClaimed',
    onLogs: async (logs) => {
      for (const log of logs) {
        try {
          // @ts-ignore
          const investor = log.args.investor.toLowerCase()
          console.log(`✅ [indexer] Investor ${investor} claimed tokens`)

          await db
            .update(investments)
            .set({ status: 'claimed', updatedAt: new Date() })
            .where(
              and(
                eq(investments.investorWallet, investor),
                eq(investments.status, 'locked'),
              ),
            )
        } catch (err) {
          console.error('[indexer] Error processing token claim:', err)
        }
      }
    },
  })

  // 5. WATCH FOR CLAIMED REFUNDS (FAILURE PATH)
  client.watchContractEvent({
    abi: POLY_IPO_ABI,
    eventName: 'RefundClaimed',
    onLogs: async (logs) => {
      for (const log of logs) {
        try {
          // @ts-ignore
          const investor = log.args.investor.toLowerCase()
          console.log(`↩️ [indexer] Investor ${investor} claimed refund`)

          await db
            .update(investments)
            .set({ status: 'refunded', updatedAt: new Date() })
            .where(
              and(
                eq(investments.investorWallet, investor),
                eq(investments.status, 'locked'),
              ),
            )
        } catch (err) {
          console.error('[indexer] Error processing refund claim:', err)
        }
      }
    },
  })

  console.log('[indexer] Watching for Web3 events...')
  console.log('[indexer] Indexer running. Press Ctrl+C to stop.')

  // Keep the process alive
  await new Promise(() => {})
}

main().catch((error) => {
  console.error('[indexer] Fatal error:', error)
  process.exit(1)
})
