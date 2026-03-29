// src/shims/qrcode-core.ts
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const QRCodeCore = require('qrcode/lib/core/qrcode.js')

export default QRCodeCore
