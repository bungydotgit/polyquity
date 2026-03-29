import 'dotenv/config'
import { createPublicClient, formatEther, http } from 'viem'
import { anvil } from 'viem/chains'
import { db } from '../db/index'
import { ipos } from '../db/schema'
import { eq } from 'drizzle-orm'
import { POLY_IPO_ABI } from '../../src/lib/constants'

// Pull the factory address from your environment variables
const POLYFACTORY_ADDRESS = process.env.POLYFACTORY_ADDRESS as `0x${string}`

if (!POLYFACTORY_ADDRESS) {
  console.error(
    '❌ POLYFACTORY_ADDRESS environment variable is required in .env',
  )
  process.exit(1)
}

// The exact event signature from your new PolyFactory contract
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
    // Check if it already exists to prevent duplicates
    const existing = await db.query.ipos.findFirst({
      where: (t, { eq }) => eq(t.contractAddress, normalizedIpoAddress),
    })

    if (existing) {
      console.log(
        `[indexer] IPO ${normalizedIpoAddress} already indexed, skipping.`,
      )
      return
    }

    // Insert the real data from the blockchain into Postgres
    await db.insert(ipos).values({
      contractAddress: normalizedIpoAddress,
      ipfsDocCid: args.ipfsCID,
      issuerWallet: args.companyWallet.toLowerCase(),
      tokenName: args.tokenName,
      tokenSymbol: args.tokenSymbol,
      // Convert Unix seconds back to JavaScript Date objects
      startTime: new Date(Number(args.startTime) * 1000),
      endTime: new Date(Number(args.endTime) * 1000),
      pricePerToken: args.tokenPrice.toString(),
      totalTokens: args.hardCap.toString(), // Usually hardcap dictates max tokens
      totalRaised: '0',
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

  client.watchContractEvent({
    address: POLYFACTORY_ADDRESS,
    abi: [IPOCreatedEvent],
    eventName: 'IPOCreated',
    onLogs: (logs) => {
      for (const log of logs) {
        if (log.args) {
          handleIPOCreated(log.args).catch(console.error)
        }
      }
    },
    onError: (error) => {
      console.error('[indexer] Watch error:', error)
    },
  })

  client.watchContractEvent({
    // Notice we don't provide an address here!
    // This tells Viem to listen to ANY contract that emits this event.
    abi: POLY_IPO_ABI,
    eventName: 'BidPlaced', // Check your Solidity file for the exact event name!
    onLogs: async (logs) => {
      for (const log of logs) {
        try {
          const ipoAddress = log.address.toLowerCase()

          // Assuming your event has args: (address investor, uint256 amount, uint256 newTotalRaised)
          const newTotalRaisedWei = log.args.totalRaised

          if (newTotalRaisedWei !== undefined) {
            const totalRaisedEth = formatEther(newTotalRaisedWei)

            // Update the database!
            await db
              .update(ipos)
              .set({ totalRaised: totalRaisedEth })
              .where(eq(ipos.contractAddress, ipoAddress))

            console.log(
              `✅ DB Updated: IPO ${ipoAddress} now has ${totalRaisedEth} ETH`,
            )
          }
        } catch (err) {
          console.error('Error processing bid event:', err)
        }
      }
    },
  })

  console.log('[indexer] Watching for new IPOCreated events...')
  console.log('[indexer] Indexer running. Press Ctrl+C to stop.')

  // Keep the process alive
  await new Promise(() => {})
}

main().catch((error) => {
  console.error('[indexer] Fatal error:', error)
  process.exit(1)
})
