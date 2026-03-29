import { useState } from 'react'
import { useAccount, useWriteContract } from 'wagmi'
import { ReclaimProofRequest } from '@reclaimprotocol/js-sdk'
import QRCode from 'react-qr-code'
import {
  Linkedin,
  Loader2,
  ShieldCheck,
  QrCode,
  Copy,
  ExternalLink,
} from 'lucide-react'

import {
  IDENTITY_REGISTRY_ADDRESS,
  IDENTITY_REGISTRY_ABI,
} from '../lib/constants'
import { generateReclaimUrl } from '../../server/functions/reclaimSession'

export function ReclaimVerification({ onSuccess }: { onSuccess?: () => void }) {
  const { address } = useAccount()
  const { writeContractAsync } = useWriteContract()

  const [requestUrl, setRequestUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<
    'idle' | 'generating' | 'waiting' | 'submitting'
  >('idle')
  const [copySuccess, setCopySuccess] = useState(false)

  const handleCopyUrl = async () => {
    if (requestUrl) {
      await navigator.clipboard.writeText(requestUrl)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    }
  }

  async function handleGenerateQR() {
    if (!address) return alert('Please connect your wallet first.')
    setStatus('generating')

    try {
      // 1. Fetch the SECURE URL and config from your TanStack backend
      const { requestUrl: serverUrl, configJson } = await generateReclaimUrl({
        data: { address },
      })

      // 2. USE THE SERVER URL DIRECTLY (This is the clean api.reclaimprotocol.org link!)
      setRequestUrl(serverUrl)
      setStatus('waiting')

      // 3. Re-hydrate the Reclaim request purely to establish the WebSocket listener
      const reclaimProofRequest =
        await ReclaimProofRequest.fromJsonString(configJson)

      // 4. Start listening for the mobile app to complete the proof
      await reclaimProofRequest.startSession({
        onSuccess: async (proofs) => {
          setStatus('submitting')

          const proof = Array.isArray(proofs) ? proofs[0] : (proofs as any)

          if (!proof) {
            console.error('No proof received')
            setStatus('idle')
            setRequestUrl(null)
            return
          }

          try {
            // 5. Format the proof to match the exact Solidity struct
            const formattedProof = {
              claimInfo: {
                provider: proof.claimInfo.provider,
                parameters: proof.claimInfo.parameters,
                context: proof.claimInfo.context,
              },
              signedClaim: {
                claim: {
                  identifier: proof.signedClaim.claim
                    .identifier as `0x${string}`,
                  owner: proof.signedClaim.claim.owner as `0x${string}`,
                  timestampS: proof.signedClaim.claim.timestampS,
                  epoch: proof.signedClaim.claim.epoch,
                },
                signatures: proof.signedClaim.signatures.map(
                  (sig: string) => sig as `0x${string}`,
                ),
              },
            }

            // 6. Submit the ZK Proof On-Chain
            await writeContractAsync({
              address: IDENTITY_REGISTRY_ADDRESS,
              abi: IDENTITY_REGISTRY_ABI,
              functionName: 'registerWithReclaim',
              args: [formattedProof],
            })

            if (onSuccess) onSuccess()
          } catch (err: unknown) {
            console.error('Smart Contract execution failed:', err)
            setStatus('idle')
            setRequestUrl(null)
          }
        },
        onError: (error: Error) => {
          console.error('Reclaim verification failed', error)
          setStatus('idle')
          setRequestUrl(null)
        },
      })
    } catch (error: unknown) {
      console.error('Failed to initialize Reclaim:', error)
      setStatus('idle')
    }
  }

  return (
    <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-8 shadow-[0_24px_40px_rgba(19,27,46,0.05)] text-center max-w-md mx-auto">
      <div className="size-16 rounded-full bg-surface-container-low flex items-center justify-center mx-auto mb-6">
        <Linkedin className="size-8 text-primary" />
      </div>

      <h2 className="text-2xl font-bold text-on-surface mb-2">
        Verify Professional ID
      </h2>
      <p className="text-on-surface/60 text-sm mb-8 leading-relaxed">
        Polyquity requires a verified LinkedIn profile. Your data remains
        completely private via zero-knowledge proofs.
      </p>

      {status === 'idle' && (
        <button
          onClick={handleGenerateQR}
          className="w-full bg-primary text-white rounded-xl py-4 font-bold hover:bg-primary-container transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
        >
          <QrCode className="size-5" />
          Generate Secure QR Code
        </button>
      )}

      {status === 'generating' && (
        <div className="flex flex-col items-center gap-3 text-primary py-4">
          <Loader2 className="size-8 animate-spin" />
          <span className="font-medium text-sm">Securing zkTLS Session...</span>
        </div>
      )}

      {status === 'waiting' && requestUrl && (
        <div className="space-y-6 animate-in fade-in zoom-in duration-300">
          <div className="bg-white p-4 rounded-xl border-2 border-surface-container-low inline-block">
            <QRCode value={requestUrl} size={200} />
          </div>
          <div className="space-y-3">
            <p className="text-sm font-bold text-on-surface animate-pulse">
              Scan with your phone camera to verify
            </p>
            <div className="flex items-center gap-2 p-3 bg-surface-container-low rounded-lg">
              <ExternalLink className="size-4 text-primary shrink-0" />
              <a
                href={requestUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline truncate flex-1"
              >
                {requestUrl}
              </a>
              <button
                onClick={handleCopyUrl}
                className="p-1 hover:bg-surface-container-high rounded transition-colors"
                title="Copy link"
              >
                <Copy className="size-4 text-on-surface/60 hover:text-on-surface" />
              </button>
            </div>
            {copySuccess && (
              <p className="text-xs text-green-600 font-medium">
                Link copied to clipboard!
              </p>
            )}
          </div>
        </div>
      )}

      {status === 'submitting' && (
        <div className="flex flex-col items-center gap-3 text-primary py-4">
          <ShieldCheck className="size-8 animate-bounce" />
          <span className="font-medium text-sm">
            Validating Proof On-Chain...
          </span>
        </div>
      )}
    </div>
  )
}
