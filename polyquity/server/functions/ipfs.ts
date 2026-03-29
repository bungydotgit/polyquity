import { createServerFn } from '@tanstack/react-start'

const PINATA_API_URL = 'https://api.pinata.cloud'

// ─── Upload a file to IPFS via Pinata ───────────────────────────────────────

export const uploadToIPFS = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: {
      fileBase64: string
      fileName: string
      mimeType: string
      metadata?: Record<string, string>
    }) => input,
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.PINATA_API_KEY
    const secretKey = process.env.PINATA_SECRET_API_KEY

    if (!apiKey || !secretKey) {
      throw new Error('Pinata API keys not configured')
    }

    // Convert base64 back to a buffer
    const fileBuffer = Buffer.from(data.fileBase64, 'base64')
    const blob = new Blob([fileBuffer], { type: data.mimeType })

    const formData = new FormData()
    formData.append('file', blob, data.fileName)

    // Optional Pinata metadata
    if (data.metadata) {
      formData.append(
        'pinataMetadata',
        JSON.stringify({
          name: data.fileName,
          keyvalues: data.metadata,
        }),
      )
    }

    const response = await fetch(`${PINATA_API_URL}/pinning/pinFileToIPFS`, {
      method: 'POST',
      headers: {
        pinata_api_key: apiKey,
        pinata_secret_api_key: secretKey,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Pinata upload failed: ${errorText}`)
    }

    const result = (await response.json()) as {
      IpfsHash: string
      PinSize: number
      Timestamp: string
    }

    return {
      cid: result.IpfsHash,
      size: result.PinSize,
      timestamp: result.Timestamp,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`,
    }
  })

// ─── Upload JSON metadata to IPFS ───────────────────────────────────────────

export const uploadJsonToIPFS = createServerFn({ method: 'POST' })
  .inputValidator(
    (input: { jsonData: Record<string, unknown>; name: string }) => input,
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.PINATA_API_KEY
    const secretKey = process.env.PINATA_SECRET_API_KEY

    if (!apiKey || !secretKey) {
      throw new Error('Pinata API keys not configured')
    }

    const response = await fetch(`${PINATA_API_URL}/pinning/pinJSONToIPFS`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        pinata_api_key: apiKey,
        pinata_secret_api_key: secretKey,
      },
      body: JSON.stringify({
        pinataContent: data.jsonData,
        pinataMetadata: { name: data.name },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Pinata JSON upload failed: ${errorText}`)
    }

    const result = (await response.json()) as {
      IpfsHash: string
      PinSize: number
      Timestamp: string
    }

    return {
      cid: result.IpfsHash,
      size: result.PinSize,
      timestamp: result.Timestamp,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`,
    }
  })
