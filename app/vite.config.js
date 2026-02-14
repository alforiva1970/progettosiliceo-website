import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/pwa/', // Custom domain serves from root, so /pwa/ is correct
  build: {
    outDir: '../pwa', // Output to root/pwa
    emptyOutDir: true,
  }
})
