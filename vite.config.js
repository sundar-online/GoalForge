import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/',
  build: {
    // Raise warning threshold slightly — we're intentionally splitting chunks
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Manual chunk splitting to avoid one giant vendor bundle.
        // Each heavy dependency gets its own cacheable chunk so users
        // only re-download what actually changed between deployments.
        manualChunks(id) {
          // Firebase SDK (~400 kB) — changes rarely, cache for a year
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) {
            return 'vendor-firebase';
          }
          // Framer Motion (~130 kB) — split from React
          if (id.includes('node_modules/framer-motion')) {
            return 'vendor-motion';
          }
          // Recharts + D3 dependencies (~200 kB)
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3') || id.includes('node_modules/victory')) {
            return 'vendor-recharts';
          }
          // Drag-and-drop library
          if (id.includes('node_modules/@hello-pangea')) {
            return 'vendor-dnd';
          }
          // Lucide icons (~470 kB) — split from React so icon updates don't bust React cache
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-lucide';
          }
          // React core — smallest and most stable; cache indefinitely
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/scheduler')) {
            return 'vendor-react';
          }
        }
      }
    }
  }
})
