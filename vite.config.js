import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/',
  build: {
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) return 'vendor-react';
          if (id.includes('node_modules/framer-motion') || id.includes('node_modules/motion')) return 'vendor-motion';
          if (id.includes('node_modules/@supabase')) return 'vendor-supabase';
          if (id.includes('node_modules/lucide-react')) return 'vendor-icons';
        },
      },
    },
  },
})
