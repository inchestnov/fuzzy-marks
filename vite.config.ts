import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import path from 'node:path'
import manifest from './manifest.config'

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    // Vite's injected <link rel="modulepreload"> next to the popup's
    // <script type="module"> makes Chrome log a spurious "cross-world
    // extension resource mismatch" warning for chrome-extension:// pages.
    // The preload isn't needed (the module script loads the same file
    // directly), so drop it to silence the warning.
    modulePreload: false,
  },
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173,
    },
  },
})
