import { createServerFn } from '@tanstack/react-start'
import { uploadFileToIPFS } from '../utils/pinata'

type UploadResponse =
  | { success: true; cid: string }
  | { success: false; error: string }

export const uploadDocumentFn = createServerFn({ method: 'POST' })
  .inputValidator((formData: FormData) => formData)
  .handler(async ({ data: formData }): Promise<UploadResponse> => {
    try {
      const file = formData.get('file')

      if (!file || !(file instanceof File)) {
        return { success: false, error: 'No valid file found.' }
      }

      if (file.type !== 'application/pdf') {
        return { success: false, error: 'Only PDF documents are permitted.' }
      }

      const MAX_FILE_SIZE = 25 * 1024 * 1024
      if (file.size > MAX_FILE_SIZE) {
        return { success: false, error: 'File exceeds 25MB limit.' }
      }

      const cid = await uploadFileToIPFS(file)
      return { success: true, cid }
    } catch (error) {
      console.error('[uploadDocumentFn] Server-side upload failure:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed.',
      }
    }
  })
