import { createServerFn } from '@tanstack/react-start'
import { ReclaimProofRequest } from '@reclaimprotocol/js-sdk'

export const generateReclaimUrl = createServerFn({ method: 'POST' })
  .inputValidator((input: { address: string }) => input)
  .handler(async ({ data }) => {
    const APP_ID = process.env.VITE_RECLAIM_APP_ID
    const APP_SECRET = process.env.RECLAIM_APP_SECRET
    const PROVIDER_ID = '6d3f6753-7ee6-49ee-a545-62f1b1822ae5'

    if (!APP_ID || !APP_SECRET) {
      throw new Error('Missing Reclaim Credentials on the Server')
    }

    // 1. Initialize the request on the server securely
    const reclaimProofRequest = await ReclaimProofRequest.init(
      APP_ID,
      APP_SECRET,
      PROVIDER_ID,
    )

    // 2. Bind the connected wallet to prevent front-running
    reclaimProofRequest.setContext(
      data.address,
      'Polyquity LinkedIn Verification',
    )

    // 3. Generate the clean URL on the server (Requires APP_SECRET to get the nice API link)
    const requestUrl = await reclaimProofRequest.getRequestUrl()

    // 4. Extract the JSON config
    const configJson = reclaimProofRequest.toJsonString()

    // 5. RETURN BOTH AS AN OBJECT
    return { requestUrl, configJson }
  })
