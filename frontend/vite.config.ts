import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, mkdirSync } from 'fs'
import { resolve } from 'path'

function spaFallback(): Plugin {
  const routes = ['insights', 'sleep-log']
  return {
    name: 'spa-fallback',
    closeBundle() {
      const dist = resolve(__dirname, 'dist')
      const index = resolve(dist, 'index.html')
      for (const route of routes) {
        const dir = resolve(dist, route)
        mkdirSync(dir, { recursive: true })
        copyFileSync(index, resolve(dir, 'index.html'))
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), spaFallback()],
  server: {
    proxy: {
      "/api": "http://127.0.0.1:8000",
    },
  },
})
