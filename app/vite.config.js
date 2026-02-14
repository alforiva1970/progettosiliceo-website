import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/progettosiliceo-website/pwa/', // Base URL for GitHub Pages repo subdirectory
  build: {
    outDir: '../pwa', // Output to root/pwa
    emptyOutDir: true,
  }
})
