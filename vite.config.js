import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The glasses load over a slow link (Meta: under 300 KB and 15 requests on first load), so React's API runs on
// Preact's compat layer: the same components and hooks at a tenth of React's size.
// The version Infrared released: each release commits it to package.json and builds that commit.
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

export default defineConfig({
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify(version) },
  resolve: {
    alias: {
      react: 'preact/compat',
      'react-dom/client': 'preact/compat/client',
      'react-dom': 'preact/compat',
      'react/jsx-runtime': 'preact/jsx-runtime',
      'react/jsx-dev-runtime': 'preact/jsx-dev-runtime',
    },
  },
  // Two pages: index.html is the glasses app and stays tiny; live/index.html (/live/) is Jared's live map, the
  // registry and the influencer's own page, for phones and laptops. Only the live page loads MapLibre.
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        live: fileURLToPath(new URL('./live/index.html', import.meta.url)),
      },
    },
  },
})
