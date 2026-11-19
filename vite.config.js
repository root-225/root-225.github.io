import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // The three.js hologram is a lazy chunk (~135 kB gzip), loaded after first paint.
  build: { chunkSizeWarningLimit: 600 },
})
