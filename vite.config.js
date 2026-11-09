import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The glasses load over a slow link (Meta: under 300 KB and 15 requests on first load), so React's API runs on
// Preact's compat layer: the same components and hooks at a tenth of React's size.
// The version Infrared released: each release commits it to package.json and builds that commit.
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

// The cape changes colour with every release (the owner, 2026-11-09): each version picks the next of these. The
// built app's hero (splash, About, tabs) wears it, and the glasses' launcher icon, a one-colour mask Meta tints with
// theme_color, is drawn in it on Darkshift Dark.
const CAPES = [
  ['Red', '#FF4549'],
  ['Gold', '#FFB020'],
  ['Blue', '#4C8DFF'],
  ['Green', '#3DA992'],
  ['Purple', '#A970FF'],
  ['Pink', '#FF5FA2'],
  ['Orange', '#FF7A1A'],
  ['Cyan', '#22C7D6'],
]
const [maj, min, pat] = version.split('.').map(Number)
const [capeName, capeHex] = CAPES[(maj * 1000 + min * 100 + pat + 1) % CAPES.length]

// After the build, put this release's cape on the hero and the launcher icon's tint in the manifest.
const cape = () => ({
  name: 'cape-colour',
  apply: 'build',
  closeBundle() {
    const svg = new URL('./dist/brand/hero-goggles-color.svg', import.meta.url)
    writeFileSync(svg, readFileSync(svg, 'utf8').replaceAll('#FF4549', capeHex).replace('Darkshift Red', `${capeName}`))
    const mf = new URL('./dist/.well-known/meta-wearables-manifest.json', import.meta.url)
    const m = JSON.parse(readFileSync(mf, 'utf8'))
    m.appearance = {
      theme_color: capeHex,
      icon_background: { colors: ['#1B5258', '#011C26'], stops: [0, 1], inner_glow_color: capeHex },
      icon: m.appearance.icon,
    }
    writeFileSync(mf, JSON.stringify(m, null, 2) + '\n')
  },
})

export default defineConfig({
  plugins: [react(), cape()],
  define: { __APP_VERSION__: JSON.stringify(version), __CAPE__: JSON.stringify({ name: capeName, hex: capeHex }) },
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
