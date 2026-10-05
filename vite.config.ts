import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // Alias "@/..." -> "src/..." (richiesto anche da shadcn/ui)
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
})
