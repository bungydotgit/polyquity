import * as FormData from 'form-data'
import * as fs from 'fs'

const PINATA_JWT = process.env.PINATA_JWT
const PINATA_API_URL = 'https://api.pinata.cloud/pinning/pinFileToIPFS'

if (!PINATA_JWT) {
  console.warn('[pinata] PINATA_JWT not set in environment variables')
}

export async function uploadFileToIPFS(file: File): Promise<string> {
  console.log(
    `[pinata] Starting upload for file: ${file.name} (${file.size} bytes)`,
  )

  if (!PINATA_JWT) {
    throw new Error('PINATA_JWT environment variable is not set')
  }

  const formData = new FormData()

  let buffer: Buffer
  if (typeof file.arrayBuffer === 'function') {
    const arrayBuffer = await file.arrayBuffer()
    buffer = Buffer.from(arrayBuffer)
  } else if (
    'path' in file &&
    typeof (file as { path?: string }).path === 'string'
  ) {
    buffer = fs.readFileSync((file as { path: string }).path)
  } else {
    throw new Error(
      'File object must have arrayBuffer() method or a valid path property',
    )
  }

  formData.append('file', buffer, {
    filename: file.name,
    contentType: file.type || 'application/octet-stream',
  })

  const metadata = JSON.stringify({ name: file.name })
  formData.append('pinataMetadata', metadata)

  const options = JSON.stringify({ cidVersion: 1 })
  formData.append('pinataOptions', options)

  const headers = formData.getHeaders()
  headers['Authorization'] = `Bearer ${PINATA_JWT}`

  console.log(`[pinata] Sending request to Pinata API...`)

  return new Promise((resolve, reject) => {
    formData.submit(
      { host: 'api.pinata.cloud', path: '/pinning/pinFileToIPFS', headers },
      (err, response) => {
        if (err) {
          console.error(`[pinata] Upload failed: ${err.message}`)
          reject(err)
          return
        }

        let data = ''
        response.on('data', (chunk) => {
          data += chunk
        })
        response.on('end', () => {
          try {
            const result = JSON.parse(data)

            if (response.statusCode !== 200) {
              console.error(
                `[pinata] Pinata API error: ${response.statusCode}`,
                result,
              )
              reject(
                new Error(
                  `Pinata API error: ${response.statusCode} - ${result.error?.details || result.message || 'Unknown error'}`,
                ),
              )
              return
            }

            const cid = result.IpfsHash
            console.log(`[pinata] Upload successful! CID: ${cid}`)
            resolve(cid)
          } catch (parseError) {
            console.error(`[pinata] Failed to parse response:`, parseError)
            reject(new Error('Failed to parse Pinata response'))
          }
        })
      },
    )
  })
}
