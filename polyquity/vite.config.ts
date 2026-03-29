import { URL, fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'

const config = defineConfig({
  define: {
    'process.env.IDKIT_WASM_PATH': JSON.stringify('/wasm/idkit_wasm_bg.wasm'),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // ✅ target the exact subpath IDKit imports
      'qrcode/lib/core/qrcode.js': 'qrcode',
    },
  },
  assetsInclude: ['**/*.wasm'],

  plugins: [
    devtools(),
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    wasm(),
    topLevelAwait(),
    tanstackStart(),
    viteReact(),
  ],

  optimizeDeps: {
    exclude: ['@worldcoin/idkit'], // keeps WASM working
    include: ['qrcode'],
  },

  ssr: {
    noExternal: ['@worldcoin/idkit'],
  },

  server: {
    proxy: {
      '/api/rpc/avalancheFuji': {
        target: 'https://api.avax-test.network/ext/bc/C/rpc',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/rpc\/avalancheFuji/, ''),
      },
      '/api/rpc/avalanche': {
        target: 'https://api.avax.network/ext/bc/C/rpc',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/rpc\/avalanche/, ''),
      },
    },
  },
})

export default config
